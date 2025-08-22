import {
  Box,
  Button,
  HStack,
  VStack,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Icon,
} from "@hope-ui/solid"
import { createResource, createSignal, For, Show, onMount } from "solid-js"
import { useT, usePublicSettings } from "~/hooks"
import { notify, handleResp, r } from "~/utils"
import { Badge, Table, Tbody, Td, Th, Thead, Tr } from "@hope-ui/solid"
import { getLabelList, getLabelDetail } from "~/utils"
import { PEmptyResp, Resp } from "~/types"
import { formatDate } from "~/utils"
import { getColorWithOpacity } from "~/utils/color"
import { DeleteModal, DeletePopover } from "~/pages/manage/common/DeletePopover"
import AddLabelDialog from "~/components/AddLabelDialog"
import { useRouter } from "~/hooks"
import { HiOutlineRefresh } from "solid-icons/hi"
import { IoAddOutline } from "solid-icons/io"

interface Label {
  id: number
  name: string
  description: string
  create_time: string
  bg_color: string
}

const TagSettings = () => {
  const t = useT()
  const { to } = useRouter()
  const [refreshing, setRefreshing] = createSignal(false)
  const [isAddLabelOpen, setIsAddLabelOpen] = createSignal(false)
  const [editingLabel, setEditingLabel] = createSignal<Label | null>(null)
  const [hasStorage, setHasStorage] = createSignal(false)
  const [showNoStorageModal, setShowNoStorageModal] = createSignal(false)
  const [showDeleteModal, setShowDeleteModal] = createSignal(false)
  const [deleteLoading, setDeleteLoading] = createSignal(false)
  const [itemToDelete, setItemToDelete] = createSignal<Label | null>(null)

  const { useNewVersion } = usePublicSettings()

  // 检查存储状态
  const checkStorage = async () => {
    try {
      const resp: Resp<any> = await r.get("/fs/list")
      if (
        resp.code === 500 &&
        resp.message?.includes("please add a storage first")
      ) {
        setShowNoStorageModal(true)
        return false
      }
      return true
    } catch (err) {
      console.error("Failed to check storage:", err)
      return false
    }
  }

  // 只有在确认有存储的情况下才获取标签列表
  const [labels, { refetch }] = createResource(async () => {
    if (!hasStorage()) return { data: { content: [], total: 0 } }
    const resp = await getLabelList()
    return resp
  })

  const deleteLabel = async (id: number): Promise<PEmptyResp> => {
    const resp = (await r.post(
      `/admin/label/delete?id=${id}`,
    )) as unknown as PEmptyResp
    return resp
  }

  const refresh = async () => {
    try {
      setRefreshing(true)
      const hasStorageNow = await checkStorage()
      setHasStorage(hasStorageNow)
      if (hasStorageNow) {
        await refetch()
        // notify.success(t("global.refresh_success"))
      }
    } catch (err) {
      notify.error(t("global.refresh_failed"))
    } finally {
      setRefreshing(false)
    }
  }

  // 初始化时检查存储状态
  onMount(() => {
    refresh()
  })

  const handleAddLabel = (
    name: string,
    description: string,
    bg_color: string,
  ) => {
    refresh()
  }

  const handleEdit = async (id: number) => {
    const resp = await getLabelDetail(id)
    handleResp(resp, (data) => {
      setEditingLabel(data)
      setIsAddLabelOpen(true)
    })
  }

  return (
    <VStack spacing="$2" alignItems="start" w="$full">
      <Show
        when={useNewVersion()}
        fallback={
          // 老版本 Tag 内容
          <VStack spacing="$2" alignItems="start" w="$full">
            <HStack spacing="$2">
              <Button
                colorScheme="accent"
                loading={refreshing()}
                onClick={refresh}
              >
                {t("global.refresh")}
              </Button>
              <Show when={hasStorage()}>
                <Button
                  onClick={() => {
                    setEditingLabel(null)
                    setIsAddLabelOpen(true)
                  }}
                >
                  {t("global.add")}
                </Button>
              </Show>
            </HStack>
            <Show when={hasStorage()}>
              <Box w="$full" overflowX="auto">
                <Table highlightOnHover dense>
                  <Thead>
                    <Tr>
                      <For each={["name", "description", "create_time"]}>
                        {(title) => <Th>{t(`home.tag.${title}`)}</Th>}
                      </For>
                      <Th>{t("global.operations")}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <For each={labels()?.data?.content || []}>
                      {(item: Label) => (
                        <Tr>
                          <Td>
                            <Badge
                              bgColor={getColorWithOpacity(item.bg_color)}
                              color={item.bg_color}
                              textTransform="none"
                              px="$3"
                              py="$2"
                              rounded="$md"
                              fontSize="$sm"
                            >
                              {item.name}
                            </Badge>
                          </Td>
                          <Td>{item.description}</Td>
                          <Td>{formatDate(item.create_time)}</Td>
                          <Td>
                            <HStack spacing="$2">
                              <Button
                                colorScheme="accent"
                                onClick={() => handleEdit(item.id)}
                              >
                                {t("global.edit")}
                              </Button>
                              <DeletePopover
                                name={item.name}
                                loading={false}
                                onClick={async () => {
                                  const resp = await deleteLabel(item.id)
                                  handleResp(resp, () => {
                                    notify.success(t("global.delete_success"))
                                    refresh()
                                  })
                                }}
                              />
                            </HStack>
                          </Td>
                        </Tr>
                      )}
                    </For>
                  </Tbody>
                </Table>
              </Box>
            </Show>
          </VStack>
        }
      >
        {/* 新版本 Tag 内容 */}
        <HStack spacing="$2">
          <Button
            style={{ background: "#1858F1" }}
            color="white"
            leftIcon={<Icon as={HiOutlineRefresh} color="white" />}
            px="$4"
            borderRadius="$lg"
            loading={refreshing()}
            onClick={refresh}
          >
            {t("global.refresh")}
          </Button>
          <Show when={hasStorage()}>
            <Button
              style={{ background: "white" }}
              color="#222"
              border="1px solid #C5C5C5"
              leftIcon={
                <Icon
                  as={IoAddOutline}
                  color="#1858F1"
                  style={{ width: "22px", height: "22px" }}
                />
              }
              px="$4"
              borderRadius="$lg"
              onClick={() => {
                setEditingLabel(null)
                setIsAddLabelOpen(true)
              }}
            >
              {t("global.add")}
            </Button>
          </Show>
        </HStack>
        <Show when={hasStorage()}>
          <Box w="$full" overflowX="auto">
            <Table highlightOnHover dense>
              <Thead>
                <Tr>
                  <For each={["name", "description", "create_time"]}>
                    {(title) => <Th>{t(`home.tag.${title}`)}</Th>}
                  </For>
                  <Th>{t("global.operations")}</Th>
                </Tr>
              </Thead>
              <Tbody>
                <For each={labels()?.data?.content || []}>
                  {(item: Label) => (
                    <Tr>
                      <Td>
                        <Badge
                          bgColor={getColorWithOpacity(item.bg_color)}
                          color={item.bg_color}
                          textTransform="none"
                          px="$3"
                          py="$2"
                          rounded="$md"
                          fontSize="$sm"
                        >
                          {item.name}
                        </Badge>
                      </Td>
                      <Td>{item.description}</Td>
                      <Td>{formatDate(item.create_time)}</Td>
                      <Td>
                        <HStack spacing="$2">
                          <Button
                            pl="$0"
                            style={{
                              color: "#1858F1",
                              background: "transparent",
                              paddingLeft: 0,
                              paddingRight: 0,
                            }}
                            _hover={{ textDecoration: "underline" }}
                            onClick={() => handleEdit(item.id)}
                          >
                            {t("global.edit")}
                          </Button>
                          <Button
                            style={{
                              color: "#1858F1",
                              background: "transparent",
                              paddingLeft: 0,
                              paddingRight: 0,
                            }}
                            _hover={{ textDecoration: "underline" }}
                            onClick={() => {
                              setItemToDelete(item)
                              setShowDeleteModal(true)
                            }}
                          >
                            {t("global.delete")}
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  )}
                </For>
              </Tbody>
            </Table>
          </Box>
        </Show>
      </Show>
      <AddLabelDialog
        isOpen={isAddLabelOpen()}
        onClose={() => {
          setIsAddLabelOpen(false)
          setEditingLabel(null)
        }}
        onSubmit={handleAddLabel}
        editingLabel={editingLabel()}
      />
      <Modal
        opened={showNoStorageModal()}
        onClose={() => setShowNoStorageModal(false)}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader></ModalHeader>
          <ModalBody>{t("storages.no_storage_content")}</ModalBody>
          <ModalFooter>
            <Button
              colorScheme="accent"
              onClick={() => setShowNoStorageModal(false)}
            >
              {t("global.cancel")}
            </Button>
            <Button
              onClick={() => {
                setShowNoStorageModal(false)
                to("/@manage/storages")
              }}
              ml="$2"
            >
              {t("home.go_to_storages")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <DeleteModal
        isOpen={showDeleteModal()}
        onClose={() => {
          setShowDeleteModal(false)
          setItemToDelete(null)
        }}
        onConfirm={async () => {
          if (itemToDelete()) {
            setDeleteLoading(true)
            const resp = await deleteLabel(itemToDelete()!.id)
            handleResp(resp, () => {
              notify.success(t("global.delete_success"))
              refresh()
              setShowDeleteModal(false)
              setItemToDelete(null)
            })
            setDeleteLoading(false)
          }
        }}
        loading={deleteLoading()}
      />
    </VStack>
  )
}

export default TagSettings
