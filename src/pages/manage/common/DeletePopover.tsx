import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  CloseButton,
  Button,
  Icon,
  HStack,
  Text,
  Box,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverHeader,
  PopoverBody,
} from "@hope-ui/solid"
import { HiOutlineExclamationCircle } from "solid-icons/hi"
import { useT } from "~/hooks"

export function DeleteModal(props: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  loading: boolean
}) {
  const t = useT()
  return (
    <Modal opened={props.isOpen} onClose={props.onClose} centered>
      <ModalOverlay />
      <ModalContent borderRadius="$lg" minW="540px" p="$4">
        <ModalHeader>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Text fontWeight="$bold" fontSize="18px">
              {t("users.delete_user.title")}
            </Text>
            <CloseButton
              onClick={props.onClose}
              _focus={{ boxShadow: "none", outline: "none" }}
            />
          </Box>
        </ModalHeader>
        <Box w="100%" h="1px" bg="#E5E6EB" my="$4" />
        <ModalBody>
          <HStack spacing="$2" alignItems="center" py="$2">
            <Box
              bg="#F53F3F"
              borderRadius="50%"
              width="24px"
              height="20px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text
                color="#fff"
                fontWeight="$bold"
                fontSize="16px"
                lineHeight="1"
              >
                !
              </Text>
            </Box>
            <Text color="#F53F3F" fontSize="15px">
              {t("users.delete_user.description")}
            </Text>
          </HStack>
        </ModalBody>
        <Box w="100%" h="1px" bg="#E5E6EB" my="$4" />
        <ModalFooter>
          <Button
            onClick={props.onClose}
            style={{
              background: "#fff",
              color: "#222",
              border: "1px solid #C5C5C5",
              borderRadius: "8px",
            }}
            _hover={{ boxShadow: "$md" }}
            mr="$2"
          >
            {t("global.cancel")}
          </Button>
          <Button
            style={{
              background: "#1858F1",
              color: "#fff",
              borderRadius: "8px",
            }}
            loading={props.loading}
            onClick={props.onConfirm}
            _hover={{ opacity: 0.9 }}
          >
            {t("global.confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export interface DeletePopoverProps {
  name: string
  loading: boolean
  onClick: () => void
  disabled?: boolean
}

export const DeletePopover = (props: DeletePopoverProps) => {
  const t = useT()
  const isDisabled = props.disabled ?? false // 默认值为 false
  return (
    <Popover>
      {({ onClose }) => (
        <>
          <PopoverTrigger
            as={Button}
            colorScheme="danger"
            disabled={isDisabled}
          >
            {t("global.delete")}
          </PopoverTrigger>
          <PopoverContent>
            <PopoverArrow />
            <PopoverHeader>
              {t("global.delete_confirm", {
                name: props.name,
              })}
            </PopoverHeader>
            <PopoverBody>
              <HStack spacing="$2">
                <Button onClick={onClose} colorScheme="neutral">
                  {t("global.cancel")}
                </Button>
                <Button
                  colorScheme="danger"
                  loading={props.loading}
                  onClick={props.onClick}
                >
                  {t("global.confirm")}
                </Button>
              </HStack>
            </PopoverBody>
          </PopoverContent>
        </>
      )}
    </Popover>
  )
}

export function Cancel2FAModal(props: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  loading: boolean
}) {
  const t = useT()
  return (
    <Modal opened={props.isOpen} onClose={props.onClose} centered>
      <ModalOverlay />
      <ModalContent borderRadius="$lg" minW="540px" p="$4">
        <ModalHeader>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Text fontWeight="$bold" fontSize="18px">
              {t("users.cancel_2fa_user.title")}
            </Text>
            <CloseButton onClick={props.onClose} />
          </Box>
        </ModalHeader>
        <Box w="100%" h="1px" bg="#E5E6EB" my="$4" />
        <ModalBody>
          <HStack spacing="$2" alignItems="center" py="$2">
            <Box
              bg="#F53F3F"
              borderRadius="50%"
              width="20px"
              height="20px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text
                color="#fff"
                fontWeight="$bold"
                fontSize="16px"
                lineHeight="1"
              >
                !
              </Text>
            </Box>
            <Text color="#F53F3F" fontSize="15px">
              {t("users.cancel_2fa_user.description")}
            </Text>
          </HStack>
        </ModalBody>
        <Box w="100%" h="1px" bg="#E5E6EB" my="$4" />
        <ModalFooter>
          <Button
            onClick={props.onClose}
            style={{
              background: "#fff",
              color: "#222",
              border: "1px solid #C5C5C5",
              borderRadius: "8px",
            }}
            _hover={{ boxShadow: "$md" }}
            mr="$2"
          >
            {t("global.cancel")}
          </Button>
          <Button
            style={{
              background: "#1858F1",
              color: "#fff",
              borderRadius: "8px",
            }}
            loading={props.loading}
            onClick={props.onConfirm}
            _hover={{ opacity: 0.9 }}
          >
            {t("global.confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
