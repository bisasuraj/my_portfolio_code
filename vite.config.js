import { defineConfig } from "vite";

export default defineConfig({
  // ...
  base: "/my_portfolio_code/",
  build: {
    sourcemap: true,   // 👈 enable source maps
  },

});
