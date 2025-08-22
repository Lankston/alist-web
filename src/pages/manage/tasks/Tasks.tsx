import {
  Button,
  Checkbox,
  Flex,
  Heading,
  HStack,
  Input,
  Spacer,
  Text,
  VStack,
  Icon,
} from "@hope-ui/solid"
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  onCleanup,
  Show,
} from "solid-js"
import { Paginator } from "~/components"
import { useFetch, useT, usePublicSettings } from "~/hooks"
import { PEmptyResp, PResp, TaskInfo } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { TaskCol, cols, Task, TaskOrderBy, TaskLocal } from "./Task"
import { me } from "~/store"
import { HiOutlineRefresh } from "solid-icons/hi"
import { FiTrash2 } from "solid-icons/fi"
import { VsTrash } from "solid-icons/vs"
import { BiRegularTrash } from "solid-icons/bi"

export interface TaskNameAnalyzer {
  regex: RegExp
  title: (matches: RegExpMatchArray) => string
  attrs: { [attr: string]: (matches: RegExpMatchArray) => JSX.Element }
}

export interface TasksProps {
  type: string
  done: string
  nameAnalyzer: TaskNameAnalyzer
  canRetry?: boolean
}

export interface TaskViewAttribute {
  curFetchTime: number
  prevFetchTime?: number
  prevProgress?: number
}

export interface TaskLocalContainer {
  local: TaskLocal
}

export interface TaskLocalSetter {
  setLocal: (l: TaskLocal) => void
  onRefresh: () => Promise<void>
}

export type TaskAttribute = TaskInfo &
  TaskViewAttribute &
  TaskLocalContainer & { isDone?: boolean }

export const Tasks = (
  props: TasksProps & {
    externalTasks?: (TaskInfo &
      TaskViewAttribute &
      TaskLocalContainer & { isDone?: boolean })[]
    onRefresh?: () => void
    updateTaskLocal?: (id: string, local: TaskLocal) => void
  },
) => {
  const t = useT()
  const { useNewVersion, isLoading } = usePublicSettings()
  const [loading, get] = useFetch((): PResp<TaskInfo[]> => {
    if (props.externalTasks)
      return Promise.resolve({ code: 200, message: "skip", data: [] }) as any
    return r.get(`/task/${props.type}/${props.done}`)
  })
  const [tasks, setTasks] = createSignal<TaskAttribute[]>([])
  const [orderBy, setOrderBy] = createSignal<TaskOrderBy>("name")
  const [orderReverse, setOrderReverse] = createSignal(false)
  const sorter: Record<TaskOrderBy, (a: TaskInfo, b: TaskInfo) => number> = {
    name: (a, b) => (a.name > b.name ? 1 : -1),
    creator: (a, b) =>
      a.creator === b.creator
        ? a.id > b.id
          ? 1
          : -1
        : a.creator > b.creator
          ? 1
          : -1,
    state: (a, b) =>
      a.state === b.state ? (a.id > b.id ? 1 : -1) : a.state > b.state ? 1 : -1,
    progress: (a, b) =>
      a.progress === b.progress
        ? a.id > b.id
          ? 1
          : -1
        : a.progress < b.progress
          ? 1
          : -1,
  }
  const curSorter = createMemo(() => {
    return (a: TaskInfo, b: TaskInfo) =>
      (orderReverse() ? -1 : 1) * sorter[orderBy()](a, b)
  })
  const refresh = async () => {
    const resp = await get()
    handleResp(resp, (data) => {
      const fetchTime = new Date().getTime()
      const curFetchTimeMap: Record<string, number> = {}
      const prevFetchTimeMap: Record<string, number | undefined> = {}
      const curProgressMap: Record<string, number> = {}
      const prevProgressMap: Record<string, number | undefined> = {}
      const taskLocalMap: Record<string, TaskLocal> = {}
      for (const task of tasks()) {
        curFetchTimeMap[task.id] = task.curFetchTime
        prevFetchTimeMap[task.id] = task.prevFetchTime
        curProgressMap[task.id] = task.progress
        prevProgressMap[task.id] = task.prevProgress
        taskLocalMap[task.id] = task.local
      }
      setTasks(
        data
          ?.map((task) => {
            let prevFetchTime: number | undefined
            let prevProgress: number | undefined
            if (task.progress === curProgressMap[task.id]) {
              prevFetchTime = prevFetchTimeMap[task.id] // may be undefined
              prevProgress = prevProgressMap[task.id] // may be undefined
            } else {
              prevFetchTime = curFetchTimeMap[task.id]
              prevProgress = curProgressMap[task.id]
            }
            const taskLocal = taskLocalMap[task.id] ?? {
              selected: false,
              expanded: false,
            }
            return {
              ...task,
              curFetchTime: fetchTime,
              prevFetchTime: prevFetchTime,
              prevProgress: prevProgress,
              local: taskLocal,
            }
          })
          .sort(curSorter()) ?? [],
      )
    })
  }
  refresh()
  if (props.done === "undone") {
    const interval = setInterval(refresh, 2000)
    onCleanup(() => clearInterval(interval))
  }
  const [clearDoneLoading, clearDone] = useFetch(
    (): PEmptyResp => r.post(`/task/${props.type}/clear_done`),
  )
  const [clearSucceededLoading, clearSucceeded] = useFetch(
    (): PEmptyResp => r.post(`/task/${props.type}/clear_succeeded`),
  )
  const [retryFailedLoading, retryFailed] = useFetch(
    (): PEmptyResp => r.post(`/task/${props.type}/retry_failed`),
  )
  console.log("props", props.type)

  const [regexFilterValue, setRegexFilterValue] = createSignal("")
  const [regexFilter, setRegexFilter] = createSignal(new RegExp(""))
  const [regexCompileFailed, setRegexCompileFailed] = createSignal(false)
  createEffect(() => {
    try {
      setRegexFilter(new RegExp(regexFilterValue()))
      setRegexCompileFailed(false)
    } catch (_) {
      setRegexCompileFailed(true)
    }
  })
  const [showOnlyMine, setShowOnlyMine] = createSignal(!me().role.includes(2))
  const taskFilter = createMemo(() => {
    const regex = regexFilter()
    const mine = showOnlyMine()
    return (task: any): boolean =>
      regex.test(task.name) && (!mine || task.creator === me().username)
  })
  // 过滤和排序都基于 externalTasks
  const tasksData = createMemo(() => {
    const base = props.externalTasks ?? tasks()
    return base
      .map((t) => ({ ...t, local: t.local ?? { expanded: false } }))
      .filter(taskFilter())
      .sort(curSorter())
  })
  const allSelected = createMemo(() =>
    tasksData()
      .map((task) => task.local?.selected)
      .every(Boolean),
  )
  const isIndeterminate = createMemo(
    () =>
      tasksData()
        .map((task) => task.local?.selected)
        .some(Boolean) && !allSelected(),
  )
  const selectAll = (v: boolean) => {
    if (props.externalTasks) {
      // 对于 externalTasks，使用专门的更新函数
      if (props.updateTaskLocal) {
        tasksData().forEach((task) => {
          if (taskFilter()(task)) {
            props.updateTaskLocal!(task.id, { ...task.local, selected: v })
          }
        })
      }
    } else {
      setTasks(
        tasks().map((task) => {
          if (taskFilter()(task)) {
            task.local.selected = v
          }
          return task
        }),
      )
    }
  }
  const allExpanded = createMemo(() =>
    tasksData()
      .map((task) => task.local?.expanded)
      .every(Boolean),
  )
  const expandAll = (v: boolean) =>
    setTasks(
      tasks().map((task) => {
        if (taskFilter()(task)) {
          task.local.expanded = v
        }
        return task
      }),
    )
  const getSelectedIds = () =>
    tasksData()
      .filter((task) => task.local?.selected)
      .map((task) => task.id)
  const [retrySelectedLoading, retrySelected] = useFetch(
    (): PEmptyResp =>
      r.post(`/task/${props.type}/retry_some`, getSelectedIds()),
  )
  const [operateSelectedLoading, operateSelected] = useFetch(
    (): PEmptyResp =>
      r.post(`/task/${props.type}/${operateName}_some`, getSelectedIds()),
  )
  const notifyIndividualError = (msg: Record<string, string>) => {
    Object.entries(msg).forEach(([key, value]) => {
      notify.error(`${key}: ${value}`)
    })
  }
  const [page, setPage] = createSignal(1)
  const pageSize = 20
  const operateName = props.done === "undone" ? "cancel" : "delete"
  const curTasks = createMemo(() => {
    const start = (page() - 1) * pageSize
    const end = start + pageSize
    return tasksData().slice(start, end)
  })
  const itemProps = (col: TaskCol) => {
    return {
      fontWeight: "bold",
      fontSize: "$sm",
      color: "$neutral11",
      textAlign: col.textAlign as any,
    }
  }
  const itemPropsSort = (col: TaskCol) => {
    return {
      cursor: "pointer",
      onClick: () => {
        if (orderBy() === col.name) {
          setOrderReverse(!orderReverse())
        } else {
          batch(() => {
            setOrderBy(col.name as TaskOrderBy)
            setOrderReverse(false)
          })
        }
        if (props.onRefresh) props.onRefresh()
      },
    }
  }
  const getLocalSetter = (id: string) => {
    return (l: TaskLocal) => {
      if (props.externalTasks) {
        // 对于 externalTasks，使用专门的更新函数
        if (props.updateTaskLocal) {
          props.updateTaskLocal(id, l)
        }
      } else {
        setTasks(
          tasks().map((t) => {
            if (t.id === id) {
              t.local = l
            }
            return t
          }),
        )
      }
    }
  }
  return (
    <VStack w="$full" alignItems="start" spacing="$2">
      <Show when={!isLoading()}>
        <Show
          when={useNewVersion()}
          fallback={
            // 老版本按钮样式
            <HStack gap="$2" flexWrap="wrap">
              <Show when={props.done === "done"}>
                <Button
                  colorScheme="accent"
                  loading={loading()}
                  onClick={refresh}
                >
                  {t(`global.refresh`)}
                </Button>
                <Button
                  loading={retryFailedLoading()}
                  onClick={async () => {
                    const resp = await retryFailed()
                    handleResp(resp, () => refresh())
                  }}
                >
                  {t(`tasks.retry_failed`)}
                </Button>
                <Button
                  colorScheme="danger"
                  loading={clearDoneLoading()}
                  onClick={async () => {
                    const resp = await clearDone()
                    handleResp(resp, () => refresh())
                  }}
                >
                  {t(`global.clear`)}
                </Button>
                <Button
                  colorScheme="success"
                  loading={clearSucceededLoading()}
                  onClick={async () => {
                    const resp = await clearSucceeded()
                    handleResp(resp, () => refresh())
                  }}
                >
                  {t(`tasks.clear_succeeded`)}
                </Button>
              </Show>
              <Show when={props.canRetry}>
                <Button
                  colorScheme="primary"
                  loading={retrySelectedLoading()}
                  onClick={async () => {
                    const resp = await retrySelected()
                    handleResp(resp, (data) => {
                      notifyIndividualError(data)
                      refresh()
                    })
                  }}
                >
                  {t(`tasks.retry_selected`)}
                </Button>
              </Show>
              <Button
                colorScheme="warning"
                loading={operateSelectedLoading()}
                onClick={async () => {
                  const resp = await operateSelected()
                  handleResp(resp, (data) => {
                    notifyIndividualError(data)
                    refresh()
                  })
                }}
              >
                {t(`tasks.${operateName}_selected`)}
              </Button>
            </HStack>
          }
        >
          {/* 新版本按钮样式 */}
          <HStack gap="$2" flexWrap="wrap">
            <Show when={props.done === "done"}>
              <Button
                leftIcon={
                  <Icon
                    as={HiOutlineRefresh}
                    color="white"
                    style={{ width: "18px", height: "18px" }}
                  />
                }
                style={{ background: "#1858F1" }}
                color="white"
                px="$4"
                borderRadius="$lg"
                boxShadow="none"
                border="none"
                _hover={{ opacity: 0.9 }}
                loading={loading()}
                onClick={() => {
                  if (props.onRefresh) {
                    props.onRefresh()
                  } else {
                    refresh()
                  }
                }}
              >
                {t(`global.refresh`)}
              </Button>
              <Button
                leftIcon={
                  <Icon
                    as={FiTrash2}
                    color="#1858F1"
                    style={{ width: "18px", height: "18px" }}
                  />
                }
                style={{ background: "white" }}
                color="#222"
                border="1px solid #C5C5C5"
                px="$4"
                borderRadius="$lg"
                _hover={{ boxShadow: "$md" }}
                loading={clearDoneLoading()}
                onClick={async () => {
                  const resp = await clearDone()
                  handleResp(resp, () => {
                    if (props.onRefresh) {
                      props.onRefresh()
                    } else {
                      refresh()
                    }
                  })
                }}
              >
                {t(`global.clear`)}
              </Button>
              <Button
                leftIcon={
                  <Icon
                    as={VsTrash}
                    color="#1858F1"
                    style={{ width: "18px", height: "18px" }}
                  />
                }
                style={{ background: "white" }}
                color="#222"
                border="1px solid #C5C5C5"
                px="$4"
                borderRadius="$lg"
                _hover={{ boxShadow: "$md" }}
                loading={clearSucceededLoading()}
                onClick={async () => {
                  const resp = await clearSucceeded()
                  handleResp(resp, () => {
                    if (props.onRefresh) {
                      props.onRefresh()
                    } else {
                      refresh()
                    }
                  })
                }}
              >
                {t(`tasks.delete_succeeded`)}
              </Button>
              <Button
                leftIcon={
                  <Icon
                    as={BiRegularTrash}
                    color={
                      getSelectedIds().length === 0 ? "#9CA3AF" : "#1858F1"
                    }
                    style={{ width: "18px", height: "18px" }}
                  />
                }
                style={{
                  background: "white",
                  opacity: getSelectedIds().length === 0 ? 0.5 : 1,
                }}
                color={getSelectedIds().length === 0 ? "#9CA3AF" : "#222"}
                border="1px solid #C5C5C5"
                px="$4"
                borderRadius="$lg"
                _hover={{
                  boxShadow: getSelectedIds().length > 0 ? "$md" : "none",
                }}
                loading={operateSelectedLoading()}
                disabled={getSelectedIds().length === 0}
                onClick={async () => {
                  const resp = await operateSelected()
                  handleResp(resp, (data) => {
                    notifyIndividualError(data)
                    if (props.onRefresh) {
                      props.onRefresh()
                    } else {
                      refresh()
                    }
                  })
                }}
              >
                {t(`tasks.${operateName}_selected`)}
              </Button>
              <Button
                leftIcon={
                  <img
                    src="/images/retry.png"
                    style={{ width: "18px", height: "18px" }}
                  />
                }
                style={{ background: "white" }}
                color="#222"
                border="1px solid #C5C5C5"
                px="$4"
                borderRadius="$lg"
                _hover={{ boxShadow: "$md" }}
                loading={retryFailedLoading()}
                onClick={async () => {
                  const resp = await retryFailed()
                  handleResp(resp, () => {
                    if (props.onRefresh) {
                      props.onRefresh()
                    } else {
                      refresh()
                    }
                  })
                }}
              >
                {t(`tasks.retry_failed`)}
              </Button>
              <Show when={props.canRetry}>
                <Button
                  leftIcon={
                    <img
                      src="/images/retry02.png"
                      style={{
                        width: "18px",
                        height: "18px",
                        filter:
                          getSelectedIds().length === 0
                            ? "grayscale(100%) brightness(0.6)"
                            : "none",
                      }}
                    />
                  }
                  style={{
                    background: "white",
                    opacity: getSelectedIds().length === 0 ? 0.5 : 1,
                  }}
                  color={getSelectedIds().length === 0 ? "#9CA3AF" : "#222"}
                  border="1px solid #C5C5C5"
                  px="$4"
                  borderRadius="$lg"
                  _hover={{
                    boxShadow: getSelectedIds().length > 0 ? "$md" : "none",
                  }}
                  loading={retrySelectedLoading()}
                  disabled={getSelectedIds().length === 0}
                  onClick={async () => {
                    const resp = await retrySelected()
                    handleResp(resp, (data) => {
                      notifyIndividualError(data)
                      if (props.onRefresh) {
                        props.onRefresh()
                      } else {
                        refresh()
                      }
                    })
                  }}
                >
                  {t(`tasks.retry_selected`)}
                </Button>
              </Show>
            </Show>
            <Input
              width="auto"
              placeholder={t(`tasks.filter`)}
              value={regexFilterValue()}
              onInput={(e: any) =>
                setRegexFilterValue(e.target.value as string)
              }
              invalid={regexCompileFailed()}
            />
            <Show when={me().role.includes(2)}>
              <Checkbox
                checked={showOnlyMine()}
                onChange={(e: any) =>
                  setShowOnlyMine(e.target.checked as boolean)
                }
              >
                {t(`tasks.show_only_mine`)}
              </Checkbox>
            </Show>
          </HStack>
        </Show>
      </Show>
      <VStack
        w={{ "@initial": "1024px", "@lg": "$full" }}
        overflowX="auto"
        spacing="$0_5"
        p="$0_5"
      >
        <HStack class="title" w="$full" p="$1">
          <HStack w={cols[0].w} spacing="$1">
            <Checkbox
              disabled={tasksData().length === 0}
              checked={allSelected()}
              indeterminate={isIndeterminate()}
              onChange={(e: any) => selectAll(e.target.checked as boolean)}
            />
            <Text fontWeight="bold" fontSize="$sm" color="$neutral11">
              {t(`tasks.attr.${cols[0].name}`)}
            </Text>
          </HStack>
          <Show when={me().role.includes(2)}>
            <Text
              w={cols[1].w}
              fontWeight="bold"
              fontSize="$sm"
              color="$neutral11"
              textAlign="left"
            >
              {t(`tasks.attr.${cols[1].name}`)}
            </Text>
          </Show>
          <Text
            w={cols[2].w}
            fontWeight="bold"
            fontSize="$sm"
            color="$neutral11"
            textAlign="left"
          >
            {t(`tasks.attr.${cols[2].name}`)}
          </Text>
          <Text
            w={cols[3].w}
            fontWeight="bold"
            fontSize="$sm"
            color="$neutral11"
            textAlign="left"
          >
            {t(`tasks.attr.${cols[3].name}`)}
          </Text>
          <Text
            w={cols[4].w}
            fontWeight="bold"
            fontSize="$sm"
            color="$neutral11"
            textAlign="left"
          >
            {t(`tasks.attr.${cols[4].name}`)}
          </Text>
          <Text
            w={cols[5].w}
            fontWeight="bold"
            fontSize="$sm"
            color="$neutral11"
            textAlign="left"
          >
            {t(`tasks.attr.${cols[5].name}`)}
          </Text>
        </HStack>
        {curTasks().map((task) => (
          <Task
            {...task}
            {...props}
            done={task.isDone ? "done" : "undone"}
            setLocal={getLocalSetter(task.id)}
            onRefresh={async () => {
              await props.onRefresh?.()
            }}
          />
        ))}
      </VStack>
      <Paginator
        total={tasksData().length}
        defaultPageSize={pageSize}
        onChange={(p) => {
          setPage(p)
        }}
      />
    </VStack>
  )
}

export const TypeTasks = (props: {
  type: string
  nameAnalyzer: TaskNameAnalyzer
  canRetry?: boolean
}) => {
  const t = useT()
  const { useNewVersion } = usePublicSettings()
  const [allTasks, setAllTasks] = createSignal<
    (TaskInfo & TaskViewAttribute & TaskLocalContainer & { isDone?: boolean })[]
  >([])
  const [loading, setLoading] = createSignal(false)

  // 添加一个函数来更新单个任务的状态
  const updateTaskLocal = (id: string, local: TaskLocal) => {
    setAllTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, local } : task)),
    )
  }

  const fetchAllTasks = async () => {
    setLoading(true)
    try {
      // 同时请求 done 和 undone 任务
      const [doneRaw, undoneRaw] = await Promise.all([
        r.get(`/task/${props.type}/done`),
        r.get(`/task/${props.type}/undone`),
      ])

      // 处理 done 任务数据
      const done = doneRaw.data ? doneRaw.data : doneRaw
      let doneTasks: any[] = []
      if (Array.isArray(done)) {
        doneTasks = done
      } else if (done && Array.isArray(done.data)) {
        doneTasks = done.data
      }

      // 处理 undone 任务数据
      const undone = undoneRaw.data ? undoneRaw.data : undoneRaw
      let undoneTasks: any[] = []
      if (Array.isArray(undone)) {
        undoneTasks = undone
      } else if (undone && Array.isArray(undone.data)) {
        undoneTasks = undone.data
      }

      // 合并任务数据，为 done 任务添加 isDone 标识
      const now = Date.now()

      // 保持现有的选择状态
      const existingTasks = allTasks()
      const existingTaskMap = new Map(existingTasks.map((t) => [t.id, t.local]))

      const doneTasksWithFlag = doneTasks.map((t) => ({
        ...t,
        local: existingTaskMap.get(t.id) ?? {
          selected: false,
          expanded: false,
        },
        curFetchTime: now,
        prevFetchTime: undefined,
        prevProgress: undefined,
        isDone: true,
      }))

      const undoneTasksWithFlag = undoneTasks.map((t) => ({
        ...t,
        local: existingTaskMap.get(t.id) ?? {
          selected: false,
          expanded: false,
        },
        curFetchTime: now,
        prevFetchTime: undefined,
        prevProgress: undefined,
        isDone: false,
      }))

      const mergedTasks = [...undoneTasksWithFlag, ...doneTasksWithFlag]

      setAllTasks(mergedTasks)
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
      notify.error("获取任务列表失败")
    } finally {
      setLoading(false)
    }
  }

  createEffect(fetchAllTasks)

  // 添加轮询逻辑，每2秒刷新一次数据
  const interval = setInterval(fetchAllTasks, 2000)
  onCleanup(() => {
    clearInterval(interval)
    setAllTasks([])
  })

  return (
    <Tasks
      type={props.type}
      done="done"
      nameAnalyzer={props.nameAnalyzer}
      canRetry={props.canRetry}
      externalTasks={allTasks()}
      onRefresh={fetchAllTasks}
      updateTaskLocal={updateTaskLocal}
    />
  )
}
