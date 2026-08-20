import { createApp } from "vue";
import { prdData } from "../data/prdData";

async function mountPrototype() {
  if (prdData.meta.targetPlatform === "desktop") {
    const [{ default: PrototypeApp }, { default: Antd }] = await Promise.all([
      import("./desktop/DesktopPrototype.vue"),
      import("ant-design-vue"),
    ]);
    createApp(PrototypeApp).use(Antd).mount("#prototype-app");
    return;
  }

  const { default: PrototypeApp } = await import("./mobile/MobilePrototype.vue");
  createApp(PrototypeApp).mount("#prototype-app");
}

void mountPrototype();
