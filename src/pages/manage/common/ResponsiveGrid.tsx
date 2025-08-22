import { Grid } from "@hope-ui/solid"
import { JSXElement } from "solid-js"
import { getSetting } from "~/store"
import { usePublicSettings } from "~/hooks"

export const ResponsiveGrid = (props: { children: JSXElement }) => {
  const layout = getSetting("settings_layout")
  const { useNewVersion } = usePublicSettings()

  let v
  if (layout === "responsive") {
    if (useNewVersion()) {
      // 新版本使用 3 列布局
      v = "repeat(3, 1fr)"
    } else {
      v = "repeat(auto-fill, minmax(424px, 1fr))"
    }
  }

  return (
    <Grid
      w="$full"
      gap="$2"
      templateColumns={{
        "@initial": "1fr",
        "@md": useNewVersion() ? "repeat(2, 1fr)" : "1fr",
        "@lg": v,
      }}
    >
      {props.children}
    </Grid>
  )
}
