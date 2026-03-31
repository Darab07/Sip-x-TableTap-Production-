import React from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { AnimatePresence } from "framer-motion";
import Menu from "@/pages/menu";
import Checkout from "@/pages/checkout";
import Admin from "@/pages/admin";
import Restaurant from "@/pages/restaurant";
import RestaurantManager from "@/pages/restaurant-manager";
import RestaurantDashboard from "@/pages/restaurant-dashboard";
import RestaurantManagerDashboard from "@/pages/restaurant-manager-dashboard";
import RestaurantManagerMenuManagement from "@/pages/restaurant-manager-menu-management";
import RestaurantManagerTableManagement from "@/pages/restaurant-manager-table-management";
import RestaurantMenuInsights from "@/pages/restaurant-menu-insights";
import RestaurantOrders from "@/pages/restaurant-orders";
import RestaurantTableManagement from "@/pages/restaurant-table-management";
import RestaurantAdminQrManagement from "@/pages/restaurant-admin-qr-management";
import RestaurantAdminEarnings from "@/pages/restaurant-admin-earnings";
import NotFound from "@/pages/not-found";
import { isRestaurantAuthenticated } from "@/lib/restaurant-auth";
const redirectPaths = ["/", "/Sip"];

const createRedirectComponent =
  (target: string) =>
  () =>
    <Redirect to={target} />;

const AppRouter = () => {
  const [location] = useLocation();
  const defaultMenuRoute = "/menu";
  const hasOwnerAccess = isRestaurantAuthenticated("owner");
  const hasManagerAccess = isRestaurantAuthenticated("manager");
  const hasAdminAccess = isRestaurantAuthenticated("admin");
  const hasManagerViewAccess = hasManagerAccess || hasOwnerAccess;

  return (
    <AnimatePresence mode="wait">
      <Switch location={location} key={location}>
        <Route path="/menu/:menuPath*" component={Menu} />
        <Route path="/menu" component={Menu} />
        <Route path="/checkout/:type" component={Checkout} />
        <Route path="/restaurant/dashboard">
          {() =>
            hasOwnerAccess ? (
              <RestaurantDashboard />
            ) : (
              <Redirect to="/restaurant" />
            )}
        </Route>
        <Route path="/restaurant/menu-insights">
          {() =>
            hasOwnerAccess ? (
              <RestaurantMenuInsights />
            ) : (
              <Redirect to="/restaurant" />
            )}
        </Route>
        <Route path="/restaurant/orders">
          {() =>
            hasOwnerAccess ? (
              <RestaurantOrders />
            ) : (
              <Redirect to="/restaurant" />
            )}
        </Route>
        <Route path="/restaurant/table-management">
          {() =>
            hasOwnerAccess ? (
              <RestaurantTableManagement />
            ) : (
              <Redirect to="/restaurant" />
            )}
        </Route>
        <Route path="/restaurant/tools-manager/order-management">
          {() =>
            hasOwnerAccess ? (
              <RestaurantManagerDashboard dashboardRole="owner" />
            ) : (
              <Redirect to="/restaurant" />
            )}
        </Route>
        <Route path="/restaurant/tools-manager/menu-management">
          {() =>
            hasOwnerAccess ? (
              <RestaurantManagerMenuManagement dashboardRole="owner" />
            ) : (
              <Redirect to="/restaurant" />
            )}
        </Route>
        <Route path="/restaurant/tools-manager/table-management">
          {() =>
            hasOwnerAccess ? (
              <RestaurantManagerTableManagement dashboardRole="owner" />
            ) : (
              <Redirect to="/restaurant" />
            )}
        </Route>
        <Route path="/restaurant/manager/dashboard">
          {() =>
            hasManagerViewAccess ? (
              <Redirect to="/restaurant/manager/live-orders" />
            ) : (
              <Redirect to="/restaurant/manager" />
            )}
        </Route>
        <Route path="/restaurant/manager/live-orders">
          {() =>
            hasManagerViewAccess ? (
              <RestaurantManagerDashboard />
            ) : (
              <Redirect to="/restaurant/manager" />
            )}
        </Route>
        <Route path="/restaurant/manager/menu-management">
          {() =>
            hasManagerViewAccess ? (
              <RestaurantManagerMenuManagement />
            ) : (
              <Redirect to="/restaurant/manager" />
            )}
        </Route>
        <Route path="/restaurant/manager/menu-insights">
          {() =>
            hasManagerViewAccess ? (
              <Redirect to="/restaurant/manager/live-orders" />
            ) : (
              <Redirect to="/restaurant/manager" />
            )}
        </Route>
        <Route path="/restaurant/manager/orders">
          {() =>
            hasManagerViewAccess ? (
              <Redirect to="/restaurant/manager/live-orders" />
            ) : (
              <Redirect to="/restaurant/manager" />
            )}
        </Route>
        <Route path="/restaurant/manager/table-management">
          {() =>
            hasManagerViewAccess ? (
              <RestaurantManagerTableManagement />
            ) : (
              <Redirect to="/restaurant/manager" />
            )}
        </Route>
        <Route path="/restaurant/manager">
          {() =>
            hasManagerViewAccess ? (
              <Redirect to="/restaurant/manager/live-orders" />
            ) : (
              <RestaurantManager />
            )}
        </Route>
        <Route path="/restaurant/admin/dashboard">
          {() =>
            hasAdminAccess ? (
              <RestaurantDashboard />
            ) : (
              <Redirect to="/restaurant" />
            )}
        </Route>
        <Route path="/restaurant/admin/menu-insights">
          {() =>
            hasAdminAccess ? (
              <RestaurantMenuInsights />
            ) : (
              <Redirect to="/restaurant" />
            )}
        </Route>
        <Route path="/restaurant/admin/orders">
          {() =>
            hasAdminAccess ? (
              <RestaurantOrders />
            ) : (
              <Redirect to="/restaurant" />
            )}
        </Route>
        <Route path="/restaurant/admin/table-management">
          {() =>
            hasAdminAccess ? (
              <RestaurantTableManagement />
            ) : (
              <Redirect to="/restaurant" />
            )}
        </Route>
        <Route path="/restaurant/admin/qr-management">
          {() =>
            hasAdminAccess ? (
              <RestaurantAdminQrManagement />
            ) : (
              <Redirect to="/restaurant" />
            )}
        </Route>
        <Route path="/restaurant/admin/earnings">
          {() =>
            hasAdminAccess ? (
              <RestaurantAdminEarnings />
            ) : (
              <Redirect to="/restaurant" />
            )}
        </Route>
        <Route path="/restaurant/admin">
          {() =>
            hasAdminAccess ? (
              <Redirect to="/restaurant/admin/dashboard" />
            ) : (
              <Redirect to="/restaurant" />
            )}
        </Route>
        <Route path="/restaurant">
          {() =>
            hasAdminAccess ? (
              <Redirect to="/restaurant/admin/dashboard" />
            ) : hasOwnerAccess ? (
              <Redirect to="/restaurant/dashboard" />
            ) : hasManagerAccess ? (
              <Redirect to="/restaurant/manager/live-orders" />
            ) : (
              <Restaurant />
            )}
        </Route>
        <Route path="/admin" component={Admin} />

        {defaultMenuRoute &&
          redirectPaths.map((path) => (
            <Route key={`redirect-${path}`} path={path}>
              {createRedirectComponent(defaultMenuRoute)}
            </Route>
          ))}

        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
};

export default AppRouter;
