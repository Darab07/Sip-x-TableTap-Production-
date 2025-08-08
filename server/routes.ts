import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // Add a simple test route
  app.get("/api/test", (req, res) => {
    res.json({ message: "Server is working!" });
  });

  const httpServer = createServer(app);

  return httpServer;
}
