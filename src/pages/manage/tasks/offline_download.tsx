import { VStack, Tabs, TabList, Tab, TabPanel } from "@hope-ui/solid"
import { useManageTitle, usePublicSettings, useT } from "~/hooks"
import { Show } from "solid-js"
import { TypeTasks } from "./Tasks"
import {
  getOfflineDownloadNameAnalyzer,
  getOfflineDownloadTransferNameAnalyzer,
} from "./helper"

const OfflineDownload = () => {
  useManageTitle("manage.sidemenu.offline_download")
  const { useNewVersion, isLoading } = usePublicSettings()
  const t = useT()

  return (
    <Show when={!isLoading()}>
      <Show
        when={useNewVersion()}
        fallback={
          // 老版本 - 垂直布局
          <VStack w="$full" alignItems="start" spacing="$4">
            <TypeTasks
              type="offline_download"
              canRetry
              nameAnalyzer={getOfflineDownloadNameAnalyzer()}
            />
            <TypeTasks
              type="offline_download_transfer"
              canRetry
              nameAnalyzer={getOfflineDownloadTransferNameAnalyzer()}
            />
          </VStack>
        }
      >
        {/* 新版本 - Tab 布局 */}
        <Tabs w="$full" variant="underline">
          <TabList>
            <Tab _selected={{ color: "#1858F1", borderColor: "#1858F1" }}>
              {t("tasks.offline_download")}
            </Tab>
            <Tab _selected={{ color: "#1858F1", borderColor: "#1858F1" }}>
              {t("tasks.offline_download_transfer")}
            </Tab>
          </TabList>
          <VStack spacing="$2" w="$full">
            <TabPanel w="$full">
              <TypeTasks
                type="offline_download"
                canRetry
                nameAnalyzer={getOfflineDownloadNameAnalyzer()}
              />
            </TabPanel>
            <TabPanel w="$full">
              <TypeTasks
                type="offline_download_transfer"
                canRetry
                nameAnalyzer={getOfflineDownloadTransferNameAnalyzer()}
              />
            </TabPanel>
          </VStack>
        </Tabs>
      </Show>
    </Show>
  )
}

export default OfflineDownload
