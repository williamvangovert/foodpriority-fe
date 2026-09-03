import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import DonorDashboard from "./components/DonorDashboard";
import RecipientDashboard from "./components/RecipientDashboard";
import AdminDashboard from "./components/AdminDashboard";
import Login from "./components/Login";
import Register from "./components/Register";
import AdminLogin from "./components/AdminLogin";
import Profile from "./components/Profile";
import ClaimDetail from "./components/ClaimDetail";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/admin-login",
    Component: AdminLogin,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: DonorDashboard },
      { path: "donor", Component: DonorDashboard },
      { path: "recipient", Component: RecipientDashboard },
      { path: "admin", Component: AdminDashboard },
      { path: "profile", Component: Profile },
      { path: "claim/:id", Component: ClaimDetail },
    ],
  },
]);