import { createSignal, Show } from "solid-js"
import {
  VStack,
  Box,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  HStack,
} from "@hope-ui/solid"
import { For } from "solid-js"
import { SetStoreFunction } from "solid-js/store"
import { SettingItem, Resp } from "~/types"
import { S3Bucket, S3BucketItem } from "./S3BucketItem"
import { useT, usePublicSettings } from "~/hooks"
import { DeleteModal } from "../common/DeletePopover"
import { FolderChooseInput } from "~/components"
import { createStore } from "solid-js/store"

export type S3BucketsProps = {
  buckets: S3Bucket[]
  setSettings: SetStoreFunction<SettingItem[]>
  saveSettings: () => Promise<Resp<{}>>
  handleResp: <T>(resp: Resp<T>, cb?: (data: T) => void) => void
  notify: any
}

const S3Buckets = (props: S3BucketsProps) => {
  const t = useT()
  const { useNewVersion } = usePublicSettings()

  const [deleteBucket, setDeleteBucket] = createSignal<S3Bucket | null>(null)
  const [deleting, setDeleting] = createSignal(false)
  const [editBucket, setEditBucket] = createSignal<S3Bucket | null>(null)
  const [editing, setEditing] = createSignal(false)
  const [editForm, setEditForm] = createStore({ name: "", path: "" })

  const handleEdit = (bucket: S3Bucket) => {
    setEditBucket(bucket)
    setEditForm({ name: bucket.name, path: bucket.path })
  }

  const handleSaveEdit = async () => {
    if (!editForm.name || !editForm.path) {
      props.notify.error(t("settings.s3_buckets_empty"))
      return
    }

    const currentBucket = editBucket()
    if (!currentBucket) return

    const names = new Set(
      props.buckets
        .filter((b) => b.name !== currentBucket.name)
        .map((b) => b.name),
    )
    if (names.has(editForm.name)) {
      props.notify.error(t("settings.s3_buckets_duplicate_name"))
      return
    }

    setEditing(true)
    const updatedBuckets = props.buckets.map((b) =>
      b.name === currentBucket.name
        ? { ...b, name: editForm.name, path: editForm.path }
        : b,
    )

    await props.setSettings(
      (i) => i.key === "s3_buckets",
      "value",
      JSON.stringify(updatedBuckets),
    )

    const resp = await props.saveSettings()
    props.handleResp(resp, () => {
      props.notify.success(t("global.save_success"))
      setEditBucket(null)
      setEditForm({ name: "", path: "" })
    })
    setEditing(false)
  }

  return (
    <VStack alignItems="start" w="$full">
      <Show
        when={useNewVersion()}
        fallback={
          // 老版本 S3Buckets 内容
          <VStack alignItems="start" w="$full">
            <For each={props.buckets}>
              {(item) => (
                <S3BucketItem
                  {...item}
                  onChange={(val) => {
                    const updatedBuckets = props.buckets.map((b) =>
                      b.name === item.name ? val : b,
                    )
                    props.setSettings(
                      (i) => i.key === "s3_buckets",
                      "value",
                      JSON.stringify(updatedBuckets),
                    )
                  }}
                  onDelete={() => {
                    const newBuckets = props.buckets.filter(
                      (b) => b.name !== item.name,
                    )
                    props.setSettings(
                      (i) => i.key === "s3_buckets",
                      "value",
                      JSON.stringify(newBuckets),
                    )
                  }}
                />
              )}
            </For>
          </VStack>
        }
      >
        {/* 新版本 S3Buckets 内容 */}
        <Box w="$full" overflowX="auto">
          <Table highlightOnHover dense>
            <Thead>
              <Tr>
                <Th>{t("global.name")}</Th>
                <Th>{t("metas.path")}</Th>
                <Th>{t("global.operations")}</Th>
              </Tr>
            </Thead>
            <Tbody>
              <For each={props.buckets}>
                {(item) => (
                  <Tr>
                    <Td>{item.name}</Td>
                    <Td>{item.path}</Td>
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
                          onClick={() => handleEdit(item)}
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
                          onClick={() => setDeleteBucket(item)}
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

      {/* Edit Modal */}
      <Modal opened={!!editBucket()} onClose={() => setEditBucket(null)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t("global.edit")}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="$4" alignItems="start">
              <FormControl required>
                <FormLabel>{t("global.name")}</FormLabel>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm("name", e.currentTarget.value)}
                  placeholder={t("global.empty_input")}
                />
              </FormControl>
              <FormControl required>
                <FormLabel>{t("metas.path")}</FormLabel>
                <FolderChooseInput
                  value={editForm.path}
                  onChange={(val) => setEditForm("path", val)}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              mr="$2"
              onClick={() => setEditBucket(null)}
              colorScheme="neutral"
            >
              {t("global.cancel")}
            </Button>
            <Button
              style={{ background: "#1858F1" }}
              color="white"
              loading={editing()}
              onClick={handleSaveEdit}
            >
              {t("global.save")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <DeleteModal
        isOpen={!!deleteBucket()}
        onClose={() => setDeleteBucket(null)}
        onConfirm={async () => {
          if (deleteBucket()) {
            setDeleting(true)
            const newBuckets = props.buckets.filter(
              (b: S3Bucket) => b.name !== deleteBucket()!.name,
            )
            await props.setSettings(
              (i) => i.key === "s3_buckets",
              "value",
              JSON.stringify(newBuckets),
            )
            const resp = await props.saveSettings()
            props.handleResp(resp, () => {
              props.notify.success(t("global.delete_success"))
              setDeleteBucket(null)
            })
            setDeleting(false)
          }
        }}
        loading={deleting()}
      />
    </VStack>
  )
}

export default S3Buckets
