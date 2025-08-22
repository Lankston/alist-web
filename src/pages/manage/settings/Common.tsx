import {
  useFetch,
  useT,
  useRouter,
  useManageTitle,
  usePublicSettings,
} from "~/hooks"
import { Group, SettingItem, PResp, PEmptyResp, EmptyResp, Resp } from "~/types"
import {
  r,
  notify,
  getTarget,
  handleResp,
  handleRespWithoutAuthAndNotify,
} from "~/utils"
import { setSettings as setGlobalSettings, getSetting } from "~/store"
import { createStore } from "solid-js/store"
import { Button, HStack, VStack, Icon } from "@hope-ui/solid"
import { createSignal, Index, Show, createMemo } from "solid-js"
import { Item } from "./SettingItem"
import { ResponsiveGrid } from "../common/ResponsiveGrid"
import { HiOutlineRefresh } from "solid-icons/hi"
import { FiSave } from "solid-icons/fi"

export interface CommonSettingsProps {
  group: Group
}
const CommonSettings = (props: CommonSettingsProps) => {
  const t = useT()
  const { pathname } = useRouter()
  useManageTitle(`manage.sidemenu.${pathname().split("/").pop()}`)
  const [settingsLoading, getSettings] = useFetch(
    (): PResp<SettingItem[]> =>
      r.get(`/admin/setting/list?group=${props.group}`),
  )
  const [settings, setSettings] = createStore<SettingItem[]>([])
  const refresh = async () => {
    const resp = await getSettings()
    handleResp(resp, setSettings)
  }
  refresh()
  const [saveLoading, saveSettings] = useFetch(
    (): PEmptyResp => r.post("/admin/setting/save", getTarget(settings)),
  )
  const [loading, setLoading] = createSignal(false)

  const { useNewVersion, fetchPublicSettings } = usePublicSettings()

  // 对设置项进行排序，将 use_newui 放在 allow_indexed 之后
  const sortedSettings = createMemo(() => {
    const settingsArray = [...settings]
    const allowIndexedIndex = settingsArray.findIndex(
      (item) => item.key === "allow_indexed",
    )
    const useNewuiIndex = settingsArray.findIndex(
      (item) => item.key === "use_newui",
    )

    if (allowIndexedIndex !== -1 && useNewuiIndex !== -1) {
      if (useNewuiIndex < allowIndexedIndex) {
        const useNewuiItem = settingsArray.splice(useNewuiIndex, 1)[0]
        settingsArray.splice(allowIndexedIndex, 0, useNewuiItem)
      } else if (useNewuiIndex > allowIndexedIndex + 1) {
        const useNewuiItem = settingsArray.splice(useNewuiIndex, 1)[0]
        settingsArray.splice(allowIndexedIndex + 1, 0, useNewuiItem)
      }
    }

    return settingsArray
  })

  return (
    <VStack w="$full" alignItems="start" spacing="$2">
      <Show
        when={useNewVersion()}
        fallback={
          // 老版本 - 按钮在底部
          <VStack w="$full" alignItems="start" spacing="$2">
            <ResponsiveGrid>
              <Index each={sortedSettings()}>
                {(item, _) => (
                  <Item
                    {...item()}
                    onChange={(val) => {
                      setSettings((i) => item().key === i.key, "value", val)
                    }}
                    onDelete={async () => {
                      setLoading(true)
                      const resp: EmptyResp = await r.post(
                        `/admin/setting/delete?key=${item().key}`,
                      )
                      setLoading(false)
                      handleResp(resp, () => {
                        notify.success(t("global.delete_success"))
                        refresh()
                      })
                    }}
                  />
                )}
              </Index>
            </ResponsiveGrid>
            <HStack spacing="$2">
              <Button
                colorScheme="accent"
                onClick={refresh}
                loading={settingsLoading() || loading()}
              >
                {t("global.refresh")}
              </Button>
              <Button
                loading={saveLoading()}
                onClick={async () => {
                  const resp = await saveSettings()
                  handleResp(resp, () => {
                    notify.success(t("global.save_success"))
                    fetchPublicSettings()
                  })
                }}
              >
                {t("global.save")}
              </Button>
            </HStack>
          </VStack>
        }
      >
        {/* 新版本 - 按钮在顶部 */}
        <HStack spacing="$2">
          <Button
            style={{ background: "#1858F1" }}
            color="white"
            leftIcon={
              <Icon
                as={HiOutlineRefresh}
                color="white"
                style={{ width: "18px", height: "18px" }}
              />
            }
            px="$4"
            borderRadius="$lg"
            boxShadow="none"
            border="none"
            onClick={refresh}
            loading={settingsLoading() || loading()}
          >
            {t("global.refresh")}
          </Button>
          <Button
            style={{ background: "white" }}
            color="#222"
            border="1px solid #C5C5C5"
            leftIcon={
              <Icon
                as={FiSave}
                color="rgb(24, 88, 241)"
                style={{ width: "18px", height: "18px" }}
              />
            }
            px="$4"
            borderRadius="$lg"
            loading={saveLoading()}
            onClick={async () => {
              const resp = await saveSettings()
              handleResp(resp, async () => {
                notify.success(t("global.save_success"))
                try {
                  handleRespWithoutAuthAndNotify(
                    (await r.get("/public/settings")) as Resp<
                      Record<string, string>
                    >,
                    setGlobalSettings,
                    (error) =>
                      console.error(
                        "Failed to refresh global settings:",
                        error,
                      ),
                  )
                  fetchPublicSettings()
                } catch (error) {
                  console.error("Failed to refresh global settings:", error)
                }
              })
            }}
          >
            {t("global.save")}
          </Button>
        </HStack>
        <ResponsiveGrid>
          <Index each={sortedSettings()}>
            {(item, _) => (
              <Item
                {...item()}
                onChange={(val) => {
                  setSettings((i) => item().key === i.key, "value", val)
                }}
                onDelete={async () => {
                  setLoading(true)
                  const resp: EmptyResp = await r.post(
                    `/admin/setting/delete?key=${item().key}`,
                  )
                  setLoading(false)
                  handleResp(resp, () => {
                    notify.success(t("global.delete_success"))
                    refresh()
                  })
                }}
              />
            )}
          </Index>
        </ResponsiveGrid>
      </Show>
    </VStack>
  )
}

export default CommonSettings
