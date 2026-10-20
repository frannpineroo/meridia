import { eveChannel } from "eve/channels/eve";
import { httpBasic, localDev, vercelOidc } from "eve/channels/auth";

const username = process.env.DEMO_USERNAME;
const password = process.env.DEMO_PASSWORD;

export default eveChannel({
  auth: [
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Shared demo password. The browser re-sends the credentials it entered
    // on the page (see proxy.ts), since /eve/v1 is the same origin.
    // Without both env vars nothing is accepted here, so the channel fails closed.
    ...(username && password ? [httpBasic({ username, password }, { realm: "Meridia" })] : []),
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
  ],
});
