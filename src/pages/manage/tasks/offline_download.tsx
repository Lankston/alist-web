import { VStack, Tabs, TabList, Tab, TabPanel } from "@hope-ui/solid"
import { useManageTitle, useT } from "~/hooks"
import { TypeTasks } from "./Tasks"
import {
  getOfflineDownloadNameAnalyzer,
  getOfflineDownloadTransferNameAnalyzer,
} from "./helper"

const OfflineDownload = () => {
  const t = useT()
  useManageTitle("manage.sidemenu.offline_download")
  return (
    <VStack w="$full" alignItems="start" spacing="$4">
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
          {/* Download to local machine tab */}
          <TabPanel w="$full">
            <TypeTasks
              type="offline_download"
              canRetry
              nameAnalyzer={getOfflineDownloadNameAnalyzer()}
            />
          </TabPanel>

          {/* Transfer to storage tab */}
          <TabPanel w="$full">
            <TypeTasks
              type="offline_download_transfer"
              canRetry
              nameAnalyzer={getOfflineDownloadTransferNameAnalyzer()}
            />
          </TabPanel>
        </VStack>
      </Tabs>
    </VStack>
  )
}

export default OfflineDownload
