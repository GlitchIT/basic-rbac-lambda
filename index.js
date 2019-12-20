// dependencies
const Auth = require("./auth");
const { responseBuilder, getConfig } = require("./utils");
const users = require("./users");
const { debug } = require("./runtime");

exports.handler = async event => {
  if (debug) {
    console.log(JSON.stringify(event, null, 4));
  }

  return handleEvent(event).catch(err => {
    return responseBuilder(`Error: ${err.message}`, 500, event.headers);
  });
};

const handleEvent = async event => {
  if (debug) {
    console.log("getting config");
  }
  const { config, settings } = await getConfig();
  if (typeof event.body === "string") {
    event.body = JSON.parse(event.body);
  }
  if (event.path.toLowerCase() !== "/flatcms" && event.path !== "/") {
    return handlePath(event);
  }
  if (!event.body.hasOwnProperty("action")) {
    return notYetImplmented("No action in event body");
  }
  if (debug) {
    console.log("switch based on action: " + event.body.action);
  }
  switch (true) {
    case event.body.action === "signin":
      if (
        event.headers &&
        (event.headers.hasOwnProperty("Authorization") ||
          event.headers.hasOwnProperty("authorization"))
      ) {
        // TODO proper auth
        const auth = new Auth({}, config);
        if (auth.verify(event.headers.Authorization)) {
          return responseBuilder("Successfully logged in", 200, {
            ...event.headers
          });
        } else {
          return responseBuilder("Session expired", 401, {});
        }
      }
      validateAction("signin", event.body.data);
      return users.signin(event.body.data, config);

    case event.body.action === "register":
      validateAction("register", event.body.data);
      return users.register(event.body.data);

    case event.body.action === "checkUser":
      validateAction("checkUser", event.body.data);
      if (debug) {
        console.log(
          `checkUser: ${event.body.data.user}, ${event.body.data.role}`
        );
      }
      return users.checkPerms(event.body.data);

    case config.extensions &&
      Array.isArray(config.extensions) &&
      config.extensions.indexOf(event.body.action) !== -1:
      try {
        validateAction(event.body.action, event.body.data);
        const actionHandler = require(`./extensions/${event.body.action}`);
        const res = actionHandler(event.body.data);
        if (res.hasOwnProperty("body") && res.hasOwnProperty("statusCode")) {
          return res;
        } else {
          return responseBuilder(res, 200);
        }
      } catch (e) {
        return responseBuilder(
          `Error in handling extension: ${event.body.action} - ${e.message}`
        );
      }

    default:
      return notYetImplmented(event.body.action);
  }
};

const handlePath = async event => {
  //TODO handle pathing in another module
  return notYetImplmented("Path handling");
};

const notYetImplmented = message => {
  return responseBuilder(`Not implemented: ${message}`, 200);
};

const validateAction = (actionName, reqData) => {
  if (debug) {
    console.log(`Validating ${actionName}`);
  }
  const schemas = require("./schemas");
  if (
    schemas[actionName].type === "object" &&
    typeof reqData === schemas[actionName]
  ) {
    const failed = schemas[actionName].filter(attr => {
      return Object.keys(reqData).indexOf(attr) === -1;
    });
    if (failed.length) {
      if (debug) {
        console.log(`Missing: ${failed.join()}`);
      }
      throw new Error(`Missing: ${failed.join()}`);
    }
  }
  // TODO other validation outside of objects
};
