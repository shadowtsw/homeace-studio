import { createApp } from "vue";
import { createPinia } from "pinia";
import "@mdi/font/css/materialdesignicons.css";
// Bundled instead of Google Fonts: the add-on must work without internet.
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/instrument-sans/700.css";
import "@fontsource/bricolage-grotesque/600.css";
import "@fontsource/bricolage-grotesque/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";

import { i18n } from "./i18n";
import App from "./App.vue";
import { PREFERENCES } from "./constants/preferences";
import router from "./router";
import "./styles/tokens.css";
import "./styles/base.css";
import { captureEarlierVisit } from "./utils/earlierVisit";

// Before any store exists: the stores write their defaults at once, and "What's new" needs to know
// whether this browser knew HomeAce Studio before (a fresh install has nothing to catch up on).
captureEarlierVisit(PREFERENCES.seenVersion.storageKey);

const app = createApp(App);

app.use(createPinia());
app.use(i18n);
app.use(router);

app.mount("#app");
