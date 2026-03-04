import React from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { AnimatePresence } from "framer-motion";
import Menu from "@/pages/menu";
import Checkout from "@/pages/checkout";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
const redirectPaths = ["/", "/Sip"];

const createRedirectComponent =
  (target: string) =>
  () =>
    <Redirect to={target} />;

const AppRouter = () => {
  const [location] = useLocation();
  const defaultMenuRoute = "/menu";

  return (
    <AnimatePresence mode="wait">
      <Switch location={location} key={location}>
        <Route path="/menu" component={Menu} />
        <Route path="/checkout/:type" component={Checkout} />
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
