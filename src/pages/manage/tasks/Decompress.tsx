import { useManageTitle, usePublicSettings, useT } from "~/hooks"
import { VStack, Tabs, TabList, Tab, TabPanel } from "@hope-ui/solid"
import { Show } from "solid-js"
import { TypeTasks } from "~/pages/manage/tasks/Tasks"
import {
  getDecompressNameAnalyzer,
  getDecompressUploadNameAnalyzer,
} from "~/pages/manage/tasks/helper"

const Decompress = () => {
  useManageTitle("manage.sidemenu.decompress")
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
              type="decompress"
              canRetry
              nameAnalyzer={getDecompressNameAnalyzer()}
            />
            <TypeTasks
              type="decompress_upload"
              canRetry
              nameAnalyzer={getDecompressUploadNameAnalyzer()}
            />
          </VStack>
        }
      >
        {/* 新版本 - Tab 布局 */}
        <Tabs w="$full" variant="underline">
          <TabList>
            <Tab _selected={{ color: "#1858F1", borderColor: "#1858F1" }}>
              {t("tasks.decompress")}
            </Tab>
            <Tab _selected={{ color: "#1858F1", borderColor: "#1858F1" }}>
              {t("tasks.decompress_upload")}
            </Tab>
          </TabList>
          <VStack spacing="$2" w="$full">
            <TabPanel w="$full">
              <TypeTasks
                type="decompress"
                canRetry
                nameAnalyzer={getDecompressNameAnalyzer()}
              />
            </TabPanel>
            <TabPanel w="$full">
              <TypeTasks
                type="decompress_upload"
                canRetry
                nameAnalyzer={getDecompressUploadNameAnalyzer()}
              />
            </TabPanel>
          </VStack>
        </Tabs>
      </Show>
    </Show>
  )
}

export default Decompress
