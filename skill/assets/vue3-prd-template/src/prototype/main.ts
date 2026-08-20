import { createApp } from "vue";
import { prdData } from "../data/prdData";

async function mountPrototype() {
  if (prdData.meta.targetPlatform === "desktop") {
    const [{ default: PrototypeApp }, { default: Antd }] = await Promise.all([
      import("./desktop/DesktopPrototype.vue"),
      import("ant-design-vue"),
      import("ant-design-vue/dist/reset.css"),
    ]);
    createApp(PrototypeApp).use(Antd).mount("#prototype-app");
    return;
  }

  const [{ default: PrototypeApp }] = await Promise.all([
    import("./mobile/MobilePrototype.vue"),
    import("vant/lib/index.css"),
  ]);
  createApp(PrototypeApp).mount("#prototype-app");
}

void mountPrototype();
