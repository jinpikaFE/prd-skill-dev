import { createApp } from "vue";
import { createPinia } from "pinia";
import { Button, Checkbox, Field, Form, Icon, Picker, Popup, Tab, Tabs, Tag } from "vant";
import "vant/lib/index.css";
import App from "./App.vue";
import "./styles.css";

const app = createApp(App);

app.use(createPinia());
app.use(Button);
app.use(Checkbox);
app.use(Field);
app.use(Form);
app.use(Icon);
app.use(Picker);
app.use(Popup);
app.use(Tab);
app.use(Tabs);
app.use(Tag);

app.mount("#app");
