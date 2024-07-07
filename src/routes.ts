import { 
    handleAddUserToOrganisation, 
    handleCreateOrganisation, 
    handleGetAllOrganisations, 
    handleGetAllUsersInAOrganisation, 
    handleGetSingleOrganisation, 
    handleGetSingleUser, 
    handleLogin, 
    handleRegistration 
} from "./handlers.js";
import { apiServer, server } from "./server.js";

// Auth routes
server.post("/auth/register", handleRegistration);
server.post("/auth/login", handleLogin);

// protected routes
apiServer.get("/users/:id", handleGetSingleUser);
apiServer.get("/organisations", handleGetAllOrganisations);
apiServer.post("/organisations", handleCreateOrganisation);
apiServer.get("/organisations/:orgId", handleGetSingleOrganisation);

// unprotected routes
server.get("/api/organisations/:orgId/users", handleGetAllUsersInAOrganisation)
server.post("/api/organisations/:orgId/users", handleAddUserToOrganisation)


server.route("/api", apiServer);

export {
    server
};

