const express = require("express");
const { open } = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");
const cookieParser = require("cookie-parser");
const cluster = require("cluster");
const http = require("http");
const os = require("os");
const numCPUs = os.cpus().length;

const PORT = process.env.PORT || 3000;
const databasePath = path.join(__dirname, "./tasks.db");

let db = null;
let workerCount = numCPUs; // Initial number of workers

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
  } catch (error) {
    console.log(`db error ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const createApp = () => {
  const app = express();

  // Middleware to parse JSON bodies
  app.use(express.json());

  // Example GET endpoint
  app.get('/', (req, res) => {
    res.send(`Hello from worker ${process.pid}`);
  });

  // Example POST endpoint for user login
  app.post("/userlogin", async (request, response) => {
    try {
      const { username, password } = request.body;
      response.send(`Received username: ${username}, password: ${password}`);
    } catch (error) {
      response.status(400).send('Error processing request');
    }
  });

  return app;
};

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Fork initial workers.
  for (let i = 0; i < workerCount; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });

  // Example logic to dynamically scale workers
  setInterval(() => {
    // This is a placeholder for real load monitoring logic
    const currentLoad = Math.random(); // Replace with actual load calculation

    if (currentLoad > 0.75 && workerCount < numCPUs * 2) {
      console.log('High load detected, forking new worker');
      cluster.fork();
      workerCount++;
    } else if (currentLoad < 0.25 && workerCount > numCPUs) {
      console.log('Low load detected, killing a worker');
      const worker = Object.values(cluster.workers).pop();
      if (worker) {
        worker.kill();
        workerCount--;
      }
    }
  }, 1000); // Check load every second
} else {
  const app = createApp();

  // Start listening on port 3000
  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} started`);
  });
}
