import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  VStack,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Image,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Box,
  Tooltip,
} from "@hope-ui/solid"
import {
  createSignal,
  For,
  JSXElement,
  onCleanup,
  Show,
  createMemo,
} from "solid-js"
import { LinkWithBase, MaybeLoading } from "~/components"
import { useFetch, useManageTitle, useRouter, useT } from "~/hooks"
import { setMe, me, getSettingBool, getMainColor, getSetting } from "~/store"
import { PEmptyResp, UserMethods, UserPermissions, PResp, User } from "~/types"
import { handleResp, handleRespWithoutNotify, notify, r } from "~/utils"
import { WebauthnItem } from "./Webauthnitems"
import {
  RegistrationPublicKeyCredential,
  create,
  parseCreationOptionsFromJSON,
  supported,
  CredentialCreationOptionsJSON,
} from "@github/webauthn-json/browser-ponyfill"
import { PublicKeys } from "./PublicKeys"

interface Generate2FA {
  qr: string
  secret: string
}

export const Permissions = (props: { user: User }) => {
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
              bg={color(UserMethods.can(props.user, i()))}
            ></Box>
          </Tooltip>
        )}
      </For>
    </HStack>
  )
}

const PermissionBadge = (props: { can: boolean; children: JSXElement }) => {
  return (
    <Badge colorScheme={props.can ? "success" : "danger"}>
      {props.children}
    </Badge>
  )
}

const Profile = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.profile")
  const { searchParams, to } = useRouter()
  const [username, setUsername] = createSignal(me().username)
  const [password, setPassword] = createSignal("")
  const [confirmPassword, setConfirmPassword] = createSignal("")
  // 添加新的Modal状态
  const [isEditModalOpen, setIsEditModalOpen] = createSignal(false)
  const [editMode, setEditMode] = createSignal<"edit" | "add">("edit")
  const usecompatibility = getSettingBool("sso_compatibility_mode")
  // 使用 public/settings 接口中的 use_newui 字段
  const useNewVersion = createMemo(() => getSetting("use_newui") === "true")
  const [loading, save] = useFetch(
    (ssoID?: boolean): PEmptyResp =>
      r.post("/me/update", {
        username: ssoID ? me().username : username(),
        password: ssoID ? "" : password(),
        sso_id: me().sso_id,
      }),
  )

  interface WebauthnItem {
    fingerprint: string
    id: string
  }

  interface Webauthntemp {
    session: string
    options: CredentialCreationOptionsJSON
  }

  const [getauthncredentialsloading, getauthncredentials] = useFetch(
    (): PResp<WebauthnItem[]> => r.get("/authn/getcredentials"),
  )
  const [, getauthntemp] = useFetch(
    (): PResp<Webauthntemp> => r.get("/authn/webauthn_begin_registration"),
  )
  const [postregistrationloading, postregistration] = useFetch(
    (
      session: string,
      credentials: RegistrationPublicKeyCredential,
    ): PEmptyResp =>
      r.post(
        "/authn/webauthn_finish_registration",
        JSON.stringify(credentials),
        {
          headers: {
            session: session,
          },
        },
      ),
  )

  // Add 2FA modal state and functions
  const [is2FAOpen, setIs2FAOpen] = createSignal(false)
  const [otpData, setOtpData] = createSignal<Generate2FA>()
  const [otpCode, setOtpCode] = createSignal("")

  const [generateLoading, generate] = useFetch(
    (): PResp<Generate2FA> => r.post("/auth/2fa/generate"),
  )

  const [verifyLoading, verify] = useFetch(
    (): PEmptyResp =>
      r.post("/auth/2fa/verify", {
        code: otpCode(),
        secret: otpData()?.secret,
      }),
  )

  const saveMe = async (ssoID?: boolean) => {
    if (password() && password() !== confirmPassword()) {
      notify.warning(t("users.confirm_password_not_same"))
      return
    }
    const resp = await save(ssoID)
    handleResp(resp, () => {
      setMe({ ...me(), username: username() })
      if (!ssoID) {
        notify.success(t("users.update_profile_success"))
        to(`/@login?redirect=${encodeURIComponent(location.pathname)}`)
      } else {
        to("")
      }
    })
  }
  const ssoID = searchParams["sso_id"]
  if (ssoID) {
    setMe({ ...me(), sso_id: ssoID })
    saveMe(true)
  }
  function messageEvent(event: MessageEvent) {
    const data = event.data
    if (data.sso_id) {
      setMe({ ...me(), sso_id: data.sso_id })
      saveMe(true)
    }
  }
  window.addEventListener("message", messageEvent)
  onCleanup(() => {
    window.removeEventListener("message", messageEvent)
  })
  const [credentials, setcredentials] = createSignal<WebauthnItem[]>([])
  const initauthnEdit = async () => {
    const resp = await getauthncredentials()
    handleRespWithoutNotify(resp, setcredentials)
  }
  if (
    supported() &&
    !UserMethods.is_guest(me()) &&
    getSettingBool("webauthn_login_enabled")
  ) {
    initauthnEdit()
  }

  const init2FA = async () => {
    if (me().otp) {
      notify.warning(t("users.2fa_already_enabled"))
      setIs2FAOpen(false)
      return
    }
    const resp = await generate()
    handleResp(resp, setOtpData)
  }

  const verify2FA = async () => {
    const resp = await verify()
    handleResp(resp, () => {
      setMe({ ...me(), otp: true })
      notify.success(t("users.update_profile_success"))
      setIs2FAOpen(false)
      setOtpData(undefined)
      setOtpCode("")
    })
  }

  // 新版本 Profile 内容
  const NewProfileContent = () => (
    <>
      <Heading>{t("users.update_profile")}</Heading>
      <Box w="$full" overflowX="auto">
        <Table highlightOnHover dense>
          <Thead>
            <Tr>
              <For each={["username", "password", "permission"]}>
                {(title) => <Th>{t(`users.${title}`)}</Th>}
              </For>
              <Th>{t("global.operations")}</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Td>{me().username}</Td>
              <Td>******</Td>
              <Td>
                <Permissions user={me()} />
              </Td>
              <Td>
                <HStack spacing="$2">
                  <Button
                    style={{ color: "#1858F1", background: "transparent" }}
                    pl="$0"
                    _hover={{ textDecoration: "underline" }}
                    onClick={() => {
                      setEditMode("edit")
                      setIsEditModalOpen(true)
                    }}
                  >
                    {t("global.edit")}
                  </Button>
                  <Show when={!me().otp}>
                    <Button
                      style={{
                        color: "#1858F1",
                        background: "transparent",
                        paddingLeft: 0,
                        paddingRight: 0,
                      }}
                      _hover={{ textDecoration: "underline" }}
                      onClick={() => {
                        setIs2FAOpen(true)
                        init2FA()
                      }}
                    >
                      {t("users.enable_2fa")}
                    </Button>
                  </Show>
                </HStack>
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
      {/* 添加编辑Modal */}
      <Modal
        opened={isEditModalOpen()}
        onClose={() => setIsEditModalOpen(false)}
        size="2xl"
      >
        <ModalOverlay />
        <ModalContent maxW="90vw" p="$4">
          <ModalCloseButton />
          <ModalHeader>
            <Heading size="lg">
              {editMode() === "edit" ? t("global.edit") : t("global.add")}
            </Heading>
          </ModalHeader>
          <ModalBody>
            <VStack spacing="$4">
              <FormControl>
                <FormLabel>{t("users.username")}</FormLabel>
                <Input
                  value={username()}
                  onInput={(e) => setUsername(e.currentTarget.value)}
                />
              </FormControl>
              <FormControl required>
                <FormLabel>{t("users.password")}</FormLabel>
                <Input
                  type="password"
                  value={password()}
                  placeholder="********"
                  onInput={(e) => setPassword(e.currentTarget.value)}
                />
                <FormHelperText>
                  {t("users.change_password-tips")}
                </FormHelperText>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing="$2" justifyContent="flex-end">
              <Button
                style={{ background: "white" }}
                color="#222"
                border="1px solid #C5C5C5"
                px="$4"
                borderRadius="$lg"
                onMouseOver={(e) =>
                  (e.currentTarget.style.boxShadow = "var(--hope-shadows-md)")
                }
                onMouseOut={(e) => (e.currentTarget.style.boxShadow = "none")}
                onClick={() => setIsEditModalOpen(false)}
              >
                {t("global.cancel")}
              </Button>
              <Button
                style={{ background: "#1858F1" }}
                color="white"
                px="$4"
                borderRadius="$lg"
                boxShadow="none"
                border="none"
                onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
                loading={loading()}
                onClick={() => saveMe()}
              >
                {t("global.confirm")}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        opened={is2FAOpen()}
        onClose={() => setIs2FAOpen(false)}
        size="2xl"
      >
        <ModalOverlay />
        <ModalContent maxW="90vw">
          <ModalCloseButton />
          <ModalHeader>
            <Heading size="lg">{t("users.scan_qr")}</Heading>
          </ModalHeader>
          <ModalBody>
            <MaybeLoading loading={generateLoading()}>
              <Show when={otpData()}>
                <VStack spacing="$4" alignItems="center">
                  <Image boxSize="$64" rounded="$lg" src={otpData()?.qr} />
                  <VStack spacing="$2" alignItems="start" w="$full">
                    <Heading size="sm">
                      {t("users.or_manual")}:{" "}
                      <Text as="span" color={getMainColor()}>
                        {otpData()?.secret}
                      </Text>
                    </Heading>
                    <Input
                      placeholder={t("users.input_code")}
                      value={otpCode()}
                      onInput={(e) => setOtpCode(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          verify2FA()
                        }
                      }}
                    />
                  </VStack>
                </VStack>
              </Show>
            </MaybeLoading>
          </ModalBody>
          <ModalFooter>
            <Button
              style={{ background: "white" }}
              color="#222"
              border="1px solid #C5C5C5"
              px="$4"
              borderRadius="$lg"
              onMouseOver={(e) =>
                (e.currentTarget.style.boxShadow = "var(--hope-shadows-md)")
              }
              onMouseOut={(e) => (e.currentTarget.style.boxShadow = "none")}
              onClick={() => setIs2FAOpen(false)}
              mr="$2"
            >
              {t("global.cancel")}
            </Button>
            <Button
              style={{ background: "#1858F1" }}
              color="white"
              px="$4"
              borderRadius="$lg"
              boxShadow="none"
              border="none"
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
              loading={verifyLoading()}
              onClick={verify2FA}
            >
              {t("global.confirm")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )

  // 老版本 Profile 内容
  const OldProfileContent = () => (
    <>
      <Heading>{t("users.update_profile")}</Heading>
      <SimpleGrid gap="$2" columns={{ "@initial": 1, "@md": 2 }}>
        <FormControl>
          <FormLabel for="username">{t("users.change_username")}</FormLabel>
          <Input
            id="username"
            value={username()}
            onInput={(e) => {
              setUsername(e.currentTarget.value)
            }}
          />
        </FormControl>
      </SimpleGrid>
      <SimpleGrid gap="$2" columns={{ "@initial": 1, "@md": 2 }}>
        <FormControl>
          <FormLabel for="password">{t("users.change_password")}</FormLabel>
          <Input
            id="password"
            type="password"
            placeholder="********"
            value={password()}
            onInput={(e) => {
              setPassword(e.currentTarget.value)
            }}
          />
          <FormHelperText>{t("users.change_password-tips")}</FormHelperText>
        </FormControl>
        <FormControl>
          <FormLabel for="confirm-password">
            {t("users.confirm_password")}
          </FormLabel>
          <Input
            id="confirm-password"
            type="password"
            placeholder="********"
            value={confirmPassword()}
            onInput={(e) => {
              setConfirmPassword(e.currentTarget.value)
            }}
          />
          <FormHelperText>{t("users.confirm_password-tips")}</FormHelperText>
        </FormControl>
      </SimpleGrid>
      <HStack spacing="$2">
        <Button loading={loading()} onClick={[saveMe, false]}>
          {t("global.save")}
        </Button>
        <Show when={!me().otp}>
          <Button
            colorScheme="accent"
            onClick={() => {
              to("/@manage/2fa")
            }}
          >
            {t("users.enable_2fa")}
          </Button>
        </Show>
      </HStack>
      <Show
        when={
          getSettingBool("sso_login_enabled") && !UserMethods.is_guest(me())
        }
      >
        <Heading>{t("users.sso_login")}</Heading>
        <HStack spacing="$2">
          <Show
            when={me().sso_id}
            fallback={
              <Button
                onClick={() => {
                  const url = r.getUri() + "/auth/sso?method=get_sso_id"
                  if (usecompatibility) {
                    window.location.href = url
                    return
                  }
                  window.open(url, "authPopup", "width=500,height=600")
                }}
              >
                {t("users.connect_sso")}
              </Button>
            }
          >
            <Button
              colorScheme="danger"
              loading={loading()}
              onClick={() => {
                setMe({ ...me(), sso_id: "" })
                saveMe(true)
              }}
            >
              {t("users.disconnect_sso")}
            </Button>
          </Show>
        </HStack>
      </Show>
      <Show
        when={
          !UserMethods.is_guest(me()) &&
          getSettingBool("webauthn_login_enabled")
        }
      >
        <Heading>{t("users.webauthn")}</Heading>
        <HStack wrap="wrap" gap="$2" mt="$2">
          <MaybeLoading loading={getauthncredentialsloading()}>
            <For each={credentials()}>
              {(item) => (
                <WebauthnItem id={item.id} fingerprint={item.fingerprint} />
              )}
            </For>
          </MaybeLoading>
        </HStack>
        <Button
          loading={postregistrationloading()}
          onClick={async () => {
            if (!supported()) {
              notify.error(t("users.webauthn_not_supported"))
              return
            }
            const resp = await getauthntemp()
            handleResp(resp, async (data) => {
              const options = parseCreationOptionsFromJSON(data.options)
              const session = data.session
              try {
                const browserresponse = await create(options)
                handleResp(
                  await postregistration(session, browserresponse),
                  () => {
                    notify.success(t("users.add_webauthn_success"))
                  },
                )
              } catch (error: unknown) {
                if (error instanceof Error) notify.error(error.message)
              }
            })
          }}
        >
          {t("users.add_webauthn")}
        </Button>
      </Show>
      <HStack wrap="wrap" gap="$2" mt="$2">
        <For each={UserPermissions}>
          {(item, i) => (
            <PermissionBadge can={UserMethods.can(me(), i())}>
              {t(`users.permissions.${item}`)}
            </PermissionBadge>
          )}
        </For>
      </HStack>
      <PublicKeys isMine={true} userId={me().id} />
    </>
  )
  return (
    <VStack w="$full" spacing="$4" alignItems="start">
      <Show
        when={!UserMethods.is_guest(me())}
        fallback={
          <>
            <Alert
              status="warning"
              flexDirection={{
                "@initial": "column",
                "@lg": "row",
              }}
            >
              <AlertIcon mr="$2_5" />
              <AlertTitle mr="$2_5">{t("users.guest-tips")}</AlertTitle>
              <AlertDescription>{t("users.modify_nothing")}</AlertDescription>
            </Alert>
            <HStack spacing="$2">
              <Text>{t("global.have_account")}</Text>
              <Text
                color="$info9"
                as={LinkWithBase}
                href={`/@login?redirect=${encodeURIComponent(
                  location.pathname,
                )}`}
              >
                {t("global.go_login")}
              </Text>
            </HStack>
          </>
        }
      >
        <Show when={useNewVersion()} fallback={<OldProfileContent />}>
          <NewProfileContent />
        </Show>
      </Show>
      {/* <PublicKeys isMine={true} userId={me().id} /> */}
    </VStack>
  )
}

export default Profile
