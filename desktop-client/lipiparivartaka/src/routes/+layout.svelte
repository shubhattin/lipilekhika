<script>
  let { children } = $props();
  import "../app.css";
 import { ModeWatcher } from "mode-watcher";
</script>

{@render children()}
<ModeWatcher />