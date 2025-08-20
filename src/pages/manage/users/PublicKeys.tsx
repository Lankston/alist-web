import {
  Badge,
  Box,
  Button,
  createDisclosure,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spacer,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  VStack,
} from "@hope-ui/solid"
import { createSignal, For, Show, createMemo } from "solid-js"
import { useFetch, useT } from "~/hooks"
import { SSHPublicKey } from "~/types/sshkey"
import { PEmptyResp, PPageResp } from "~/types"
import { handleResp, notify, r } from "~/utils"
import { HiOutlinePlus, HiOutlineRefresh } from "solid-icons/hi"
import { createStore } from "solid-js/store"
import { getSetting } from "~/store"
import { cols, PublicKey, PublicKeyCol } from "./PublicKey"

export interface PublicKeysProps {
  isMine: boolean
  userId?: number
}

interface SSHKeyAddReq {
  title: string
  key: string
}

const formatDate = (date: string) => {
  const d = new Date(date)
  const year = d.getFullYear().toString()
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  const day = d.getDate().toString().padStart(2, "0")
  const hours = d.getHours().toString().padStart(2, "0")
  const minutes = d.getMinutes().toString().padStart(2, "0")
  const seconds = d.getSeconds().toString().padStart(2, "0")
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

export const PublicKeys = (props: PublicKeysProps) => {
  const t = useT()
  const [keys, setKeys] = createSignal<SSHPublicKey[]>([])
  const [loading, get] = props.isMine
    ? useFetch((): PPageResp<SSHPublicKey> => r.get(`/me/sshkey/list`))
    : useFetch(
        (): PPageResp<SSHPublicKey> =>
          r.get(`/admin/user/sshkey/list?uid=${props.userId}`),
      )
  const [addReq, setAddReq] = createStore<SSHKeyAddReq>({
    title: "",
    key: "",
  })
  const [addLoading, add] = useFetch(
    (): PEmptyResp => r.post(`/me/sshkey/add`, addReq),
  )
  const [deleteLoading, deleteKey] = useFetch(
    (id: number): PEmptyResp => r.post(`/me/sshkey/delete?id=${id}`),
  )
  const { isOpen, onOpen, onClose } = createDisclosure()
  // 使用 public/settings 接口中的 use_newui 字段
  const useNewVersion = createMemo(() => getSetting("use_newui") === "true")
  const refresh = async () => {
    const resp = await get()
    handleResp(resp, (data) => {
      setKeys(data.content)
    })
  }
  refresh()

  const itemProps = (col: PublicKeyCol) => {
    return {
      fontWeight: "bold",
      fontSize: "$sm",
      color: "$neutral11",
      textAlign: col.textAlign as any,
    }
  }

  // 新版本 PublicKeys 内容
  const NewPublicKeysContent = () => (
    <VStack spacing="$2" alignItems="start" w="$full">
      <HStack spacing="$2">
        <Button
          style={{ background: "#1858F1" }}
          color="white"
          _hover={{ opacity: 0.9 }}
          leftIcon={<Icon as={HiOutlineRefresh} color="white" />}
          px="$4"
          borderRadius="$lg"
          loading={loading()}
          onClick={refresh}
          boxShadow="none"
          border="none"
        >
          {t("global.refresh")}
        </Button>
        <Show when={props.isMine}>
          <Button
            style={{ background: "white" }}
            color="#222"
            border="1px solid #C5C5C5"
            leftIcon={<Icon as={HiOutlinePlus} color="#1858F1" />}
            px="$4"
            borderRadius="$lg"
            _hover={{ boxShadow: "$md" }}
            onClick={onOpen}
          >
            {t("global.add")}
          </Button>
        </Show>
      </HStack>
      <Box w="$full" overflowX="auto">
        <Table highlightOnHover dense>
          <Thead>
            <Tr>
              <For each={["title", "fingerprint", "last_used", "operation"]}>
                {(title) => <Th>{t(`users.ssh_keys.${title}`)}</Th>}
              </For>
            </Tr>
          </Thead>
          <Tbody>
            <For each={keys()}>
              {(key) => (
                <Tr>
                  <Td>{key.title}</Td>
                  <Td>
                    <Text
                      css={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {key.fingerprint}
                    </Text>
                  </Td>
                  <Td>{formatDate(key.last_used_time)}</Td>
                  <Show when={props.isMine}>
                    <Td>
                      <Button
                        style={{ color: "#1858F1", background: "transparent" }}
                        _hover={{ textDecoration: "underline" }}
                        loading={deleteLoading()}
                        onClick={async () => {
                          const resp = await deleteKey(key.id)
                          handleResp(resp, () => {
                            notify.success(t("global.delete_success"))
                            refresh()
                          })
                        }}
                      >
                        {t("global.delete")}
                      </Button>
                    </Td>
                  </Show>
                </Tr>
              )}
            </For>
          </Tbody>
        </Table>
      </Box>
      <Modal opened={isOpen()} onClose={onClose} scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader>{t("users.ssh_keys.add_heading")}</ModalHeader>
          <ModalBody>
            <FormControl mb="$4">
              <FormLabel for="add_title">{t("users.ssh_keys.title")}</FormLabel>
              <Input
                id="add_title"
                value={addReq.title}
                onInput={(e) => setAddReq("title", e.currentTarget.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel for="add_key">{t("users.ssh_keys.key")}</FormLabel>
              <Textarea
                id="add_key"
                value={addReq.key}
                onInput={(e) => setAddReq("key", e.currentTarget.value)}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button
              style={{ background: "#1858F1" }}
              color="white"
              px="$4"
              borderRadius="$lg"
              boxShadow="none"
              border="none"
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
              loading={addLoading()}
              onClick={async () => {
                const resp = await add()
                handleResp(resp, () => {
                  setAddReq("title", "")
                  setAddReq("key", "")
                  refresh()
                  onClose()
                })
              }}
            >
              {t("global.add")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  )

  // 老版本 PublicKeys 内容
  const OldPublicKeysContent = () => (
    <VStack w="$full" alignItems="start" spacing="$2">
      <Flex w="$full">
        <Heading>{t(`users.ssh_keys.heading`)}</Heading>
        <Show when={props.isMine}>
          <Spacer />
          <Button loading={loading()} onClick={onOpen}>
            {t(`global.add`)}
          </Button>
          <Modal opened={isOpen()} onClose={onClose} scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
              <ModalCloseButton />
              <ModalHeader>{t(`users.ssh_keys.add_heading`)}</ModalHeader>
              <ModalBody>
                <FormControl mb="$4">
                  <FormLabel for="add_title">
                    {t(`users.ssh_keys.title`)}
                  </FormLabel>
                  <Input
                    id="add_title"
                    value={addReq.title}
                    onInput={(e) => setAddReq("title", e.currentTarget.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel for="add_key">{t(`users.ssh_keys.key`)}</FormLabel>
                  <Textarea
                    id="add_key"
                    value={addReq.key}
                    onInput={(e) => setAddReq("key", e.currentTarget.value)}
                  />
                </FormControl>
              </ModalBody>
              <ModalFooter>
                <Button
                  loading={addLoading()}
                  onClick={async () => {
                    const resp = await add()
                    handleResp(resp, () => {
                      setAddReq("title", "")
                      setAddReq("key", "")
                      refresh()
                      onClose()
                    })
                  }}
                >
                  {t(`global.add`)}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </Show>
      </Flex>
      <VStack
        w="$full"
        overflowX="auto"
        shadow="$md"
        rounded="$lg"
        spacing="$1"
        p="$1"
      >
        <HStack class="title" w="$full" p="$2">
          <Text w={cols[0].w} {...itemProps(cols[0])}>
            {t(`users.ssh_keys.${cols[0].name}`)}
          </Text>
          <Text w={cols[1].w} {...itemProps(cols[1])}>
            {t(`users.ssh_keys.${cols[1].name}`)}
          </Text>
          <Text w={cols[2].w} {...itemProps(cols[2])}>
            {t(`users.ssh_keys.${cols[2].name}`)}
          </Text>
          <Text w={cols[3].w} {...itemProps(cols[3])}>
            {t(`users.ssh_keys.${cols[3].name}`)}
          </Text>
        </HStack>
        {keys().map((key) => (
          <PublicKey {...props} {...key} />
        ))}
      </VStack>
    </VStack>
  )

  return (
    <Show when={useNewVersion()} fallback={<OldPublicKeysContent />}>
      <NewPublicKeysContent />
    </Show>
  )
}
