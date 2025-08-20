import { useFetch, useT, useManageTitle } from "~/hooks"
import { Group, SettingItem, PResp, PEmptyResp } from "~/types"
import { r, notify, getTarget, handleResp } from "~/utils"
import { createStore } from "solid-js/store"
import {
  Button,
  HStack,
  VStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  createDisclosure,
  Text,
  FormControl,
  FormLabel,
  Input,
  Icon,
} from "@hope-ui/solid"
import { createSignal, createEffect } from "solid-js"
import S3Buckets from "./S3Buckets"
import { FolderChooseInput } from "~/components"
import crypto from "crypto-js"
import { BiSolidCopy } from "solid-icons/bi"
import { HiOutlineRefresh } from "solid-icons/hi"
import { S3Bucket } from "./S3BucketItem"
import { RiSystemShieldKeyholeLine } from "solid-icons/ri"
import { IoAddOutline } from "solid-icons/io"

const bucket_parse = (settings: SettingItem[]) => {
  const string = { ...settings.find((i) => i.key === "s3_buckets")! }
  if (!string.value) return []
  return JSON.parse(string.value)
}

const S3Settings = () => {
  const t = useT()
  useManageTitle(`manage.sidemenu.s3`)
  const { isOpen, onOpen, onClose } = createDisclosure()
  const {
    isOpen: isAddOpen,
    onOpen: onAddOpen,
    onClose: onAddClose,
  } = createDisclosure()
  const [newBucket, setNewBucket] = createStore({ name: "", path: "" })
  const [settingsLoading, getSettings] = useFetch(
    (): PResp<SettingItem[]> => r.get(`/admin/setting/list?group=${Group.S3}`),
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

  // 页面加载后自动生成密钥（仅当为空时）
  createEffect(() => {
    const accessKey = settings.find((i) => i.key === "s3_access_key_id")?.value
    const secretKey = settings.find((i) => i.key === "s3_secret_access_key")
      ?.value
    if (settings.length > 0 && (!accessKey || !secretKey)) {
      const awsAccessKeyId = crypto.lib.WordArray.random(120 / 8)
      const awsSecretAccessKey = crypto.lib.WordArray.random(240 / 8)
      const accessKeyId = crypto.enc.Base64.stringify(awsAccessKeyId).replace(
        /[\r\n]/g,
        "",
      )
      const secretAccessKey = crypto.enc.Base64.stringify(
        awsSecretAccessKey,
      ).replace(/[\r\n]/g, "")
      setSettings((i) => i.key === "s3_access_key_id", "value", accessKeyId)
      setSettings(
        (i) => i.key === "s3_secret_access_key",
        "value",
        secretAccessKey,
      )
    }
  })

  const handleAddBucket = async () => {
    // 先校验新桶参数
    if (!newBucket.name || !newBucket.path) {
      notify.error(t("settings.s3_buckets_empty"))
      return
    }
    // 获取当前 buckets
    const buckets = bucket_parse(settings)
    const names = new Set(buckets.map((b: S3Bucket) => b.name))
    if (names.has(newBucket.name)) {
      notify.error(t("settings.s3_buckets_duplicate_name"))
      return
    }
    // 合并新桶
    const updatedBuckets = [...buckets, newBucket]
    setSettings(
      (i) => i.key === "s3_buckets",
      "value",
      JSON.stringify(updatedBuckets),
    )
    // 保存
    const resp = await saveSettings()
    handleResp(resp, () => {
      notify.success(t("global.save_success"))
      onAddClose()
      setNewBucket({ name: "", path: "" })
    })
  }

  return (
    <VStack w="$full" alignItems="start" spacing="$2">
      <HStack spacing="$2" w="$full">
        <Button
          style={{ background: "#1858F1" }}
          color="white"
          leftIcon={<Icon as={HiOutlineRefresh} color="white" />}
          px="$4"
          borderRadius="$lg"
          loading={settingsLoading() || loading()}
          onClick={refresh}
          boxShadow="none"
          border="none"
          onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
        >
          {t("global.refresh")}
        </Button>
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
          loading={saveLoading()}
          onClick={onAddOpen}
          onMouseOver={(e) =>
            (e.currentTarget.style.boxShadow = "var(--hope-shadows-md)")
          }
          onMouseOut={(e) => (e.currentTarget.style.boxShadow = "none")}
        >
          {t("global.add")}
        </Button>
        <Button
          style={{ background: "white" }}
          color="#222"
          border="1px solid #C5C5C5"
          px="$4"
          borderRadius="$lg"
          leftIcon={
            <Icon
              as={RiSystemShieldKeyholeLine}
              color="#1858F1"
              style={{ width: "22px", height: "22px" }}
            />
          }
          onClick={onOpen}
          onMouseOver={(e) =>
            (e.currentTarget.style.boxShadow = "var(--hope-shadows-md)")
          }
          onMouseOut={(e) => (e.currentTarget.style.boxShadow = "none")}
        >
          S3 generate
        </Button>
      </HStack>
      {/* <ResponsiveGrid></ResponsiveGrid> */}
      <S3Buckets
        buckets={bucket_parse(settings)}
        setSettings={setSettings}
        saveSettings={saveSettings}
        handleResp={handleResp}
        notify={notify}
      />

      {/* S3 Generate Modal */}
      <Modal opened={isOpen()} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>S3 generate</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="$4" alignItems="start">
              <VStack spacing="$2" alignItems="start" w="$full">
                <Text fontWeight="$medium">
                  {t("settings.s3_access_key_id")}
                </Text>
                <HStack
                  w="$full"
                  spacing="$2"
                  p="$2"
                  bg="$neutral3"
                  borderRadius="$lg"
                >
                  <Text flex="1">
                    {settings.find((i) => i.key === "s3_access_key_id")
                      ?.value || ""}
                  </Text>
                  <Icon
                    as={BiSolidCopy}
                    cursor="pointer"
                    onClick={() => {
                      const val =
                        settings.find((i) => i.key === "s3_access_key_id")
                          ?.value || ""
                      if (val) {
                        navigator.clipboard.writeText(val)
                        notify.success("已复制")
                      }
                    }}
                  />
                </HStack>
              </VStack>
              <VStack spacing="$2" alignItems="start" w="$full">
                <Text fontWeight="$medium">
                  {t("settings.s3_secret_access_key")}
                </Text>
                <HStack
                  w="$full"
                  spacing="$2"
                  p="$2"
                  bg="$neutral3"
                  borderRadius="$lg"
                >
                  <Text flex="1">
                    {settings.find((i) => i.key === "s3_secret_access_key")
                      ?.value || ""}
                  </Text>
                  <Icon
                    as={BiSolidCopy}
                    cursor="pointer"
                    onClick={() => {
                      const val =
                        settings.find((i) => i.key === "s3_secret_access_key")
                          ?.value || ""
                      if (val) {
                        navigator.clipboard.writeText(val)
                        notify.success("已复制")
                      }
                    }}
                  />
                </HStack>
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr="$2" onClick={onClose} colorScheme="neutral">
              {t("global.cancel")}
            </Button>
            <Button
              style={{ background: "#1858F1" }}
              color="white"
              onClick={() => {
                const awsAccessKeyId = crypto.lib.WordArray.random(120 / 8)
                const awsSecretAccessKey = crypto.lib.WordArray.random(240 / 8)
                const accessKeyId = crypto.enc.Base64.stringify(
                  awsAccessKeyId,
                ).replace(/[\r\n]/g, "")
                const secretAccessKey = crypto.enc.Base64.stringify(
                  awsSecretAccessKey,
                ).replace(/[\r\n]/g, "")
                setSettings(
                  (i) => i.key === "s3_access_key_id",
                  "value",
                  accessKeyId,
                )
                setSettings(
                  (i) => i.key === "s3_secret_access_key",
                  "value",
                  secretAccessKey,
                )
              }}
            >
              {t("global.reset")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add S3 Bucket Modal */}
      <Modal opened={isAddOpen()} onClose={onAddClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t("settings.s3_buckets")}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="$4" alignItems="start">
              <FormControl required>
                <FormLabel> {t(`global.name`)}</FormLabel>
                <Input
                  value={newBucket.name}
                  onChange={(e) => setNewBucket("name", e.currentTarget.value)}
                  placeholder={t("global.empty_input")}
                />
              </FormControl>
              <FormControl required>
                <FormLabel> {t(`metas.path`)}</FormLabel>
                <FolderChooseInput
                  value={newBucket.path}
                  onChange={(val) => setNewBucket("path", val)}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr="$2" onClick={onAddClose} colorScheme="neutral">
              {t("global.cancel")}
            </Button>
            <Button
              style={{ background: "#1858F1" }}
              color="white"
              onClick={handleAddBucket}
            >
              {t("global.save")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  )
}

export default S3Settings
