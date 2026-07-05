module.exports = {
  apps: [
    {
      name: "forja-backend",
      script: "src/http/server.js",
      interpreter_args: "--env-file=.env",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
    },
  ],
};
