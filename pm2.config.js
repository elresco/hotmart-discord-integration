module.exports = {
  apps: [
    {
      name: "discord-bot",
      script: "ts-node",
      args: "src/index.ts",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
