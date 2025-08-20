import {
  Button,
  HStack,
  VStack,
  Box,
  Table,
  Thead,
  Tr,
  Td,
  Th,
  Tbody,
  Tooltip,
} from "@hope-ui/solid"
import { useT, useRouter, useFetch } from "~/hooks"
import { createSignal, For } from "solid-js"
import { getPermissionList, Permission } from "~/utils/api"
import { handleResp } from "~/utils"
import { DeleteModal } from "../common/DeletePopover"
import { UserPermissions } from "~/types"

const Permissions = (props: { permission: Permission }) => {
  const t = useT()
  const color = (can: boolean) => `$${can ? "success" : "danger"}9`
  return (
    <HStack spacing="$0_5">
      <For each={UserPermissions}>
        {(item, i) => (
          <Tooltip label={t(`users.permissions.${item}`)}>
            <Box
              boxSize="$2"
              rounded="$full"
              bg={color(((props.permission.permission >> i()) & 1) === 1)}
            ></Box>
          </Tooltip>
        )}
      </For>
    </HStack>
  )
}

const Config = () => {
  const t = useT()
  const { to } = useRouter()
  const [permissions, setPermissions] = createSignal<Permission[]>([])
  const [showDeleteModal, setShowDeleteModal] = createSignal(false)
  const [itemToDelete, setItemToDelete] = createSignal<Permission | null>(null)

  const [loading, getPermissions] = useFetch(() => getPermissionList())

  const refresh = async () => {
    const resp = await getPermissions()
    handleResp(resp, (data) => {
      setPermissions(data.content)
    })
  }

  refresh()

  return (
    <VStack spacing="$2" alignItems="start" w="$full">
      <HStack spacing="$2">
        <Button colorScheme="accent" loading={loading()} onClick={refresh}>
          {t("global.refresh")}
        </Button>
        <Button
          onClick={() => {
            to("/@manage/permissions/config/add")
          }}
        >
          {t("global.add")}
        </Button>
      </HStack>
      <Box w="$full" overflowX="auto">
        <Table highlightOnHover dense>
          <Thead>
            <Tr>
              <For
                each={[
                  "permissions_name",
                  "permissions_description",
                  "permissions_permissions",
                ]}
              >
                {(title) => <Th>{t(`permissions.config.${title}`)}</Th>}
              </For>
              <Th>{t("global.operations")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            <For each={permissions()}>
              {(permission) => (
                <Tr>
                  <Td>{permission.name}</Td>
                  <Td>{permission.description}</Td>
                  <Td>
                    <Permissions permission={permission} />
                  </Td>
                  <Td>
                    <HStack spacing="$2">
                      <Button
                        onClick={() => {
                          to(
                            `/@manage/permissions/config/edit/${permission.id}`,
                          )
                        }}
                      >
                        {t("global.edit")}
                      </Button>
                      <Button
                        colorScheme="danger"
                        onClick={() => {
                          setItemToDelete(permission)
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
      <DeleteModal
        isOpen={showDeleteModal()}
        onClose={() => {
          setShowDeleteModal(false)
          setItemToDelete(null)
        }}
        onConfirm={() => {
          // TODO: 实现删除权限的功能
          setShowDeleteModal(false)
          setItemToDelete(null)
        }}
        loading={false}
      />
    </VStack>
  )
}

export default Config
