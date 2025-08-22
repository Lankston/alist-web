// 切换新UI的hook
import { createSignal, createMemo, onMount } from "solid-js"
import { r } from "~/utils"

export const usePublicSettings = () => {
  const [publicSettings, setPublicSettings] = createSignal<
    Record<string, string>
  >({})
  const [isLoading, setIsLoading] = createSignal(true)

  const fetchPublicSettings = async () => {
    try {
      setIsLoading(true)
      const resp = await r.get("/public/settings")
      setPublicSettings(resp.data || {})
    } catch (error) {
      console.error("Failed to fetch public settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  onMount(() => {
    fetchPublicSettings()
  })

  const useNewVersion = createMemo(() => {
    return publicSettings()["use_newui"] === "true"
  })

  return {
    publicSettings,
    fetchPublicSettings,
    useNewVersion,
    isLoading,
  }
}
