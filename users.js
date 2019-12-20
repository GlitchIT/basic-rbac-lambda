const crypto = require("crypto");
const { gets3Obj, responseBuilder, getConfig, puts3Obj } = require("./utils");
// const emailReg = /^(([^<>()[]\.,;:s@"]+(.[^<>()[]\.,;:s@"]+)*)|(".+"))@(([[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}])|(([a-zA-Z-0-9]+.)+[a-zA-Z]{2,}))$/
const Auth = require("./auth");
const uuid = require("uuid/v4");
const { debug } = require("./runtime");

const getUser = (users, data) => {
  if (debug) {
    console.log(`getting user: '${data.username}' or '${data.email}'`);
  }
  let id = Object.keys(users).filter(uid => {
    let user = users[uid];
    console.log("===== user obj ======", JSON.stringify(user, null, 4));
    return (
      data.username.toLowerCase() === user.email.toLowerCase() ||
      data.username.toLowerCase() === user.username.toLowerCase()
    );
  });
  console.log(id);
  if (id.length !== 1) {
    return false;
  }
  return users[id[0]];
};

const signin = async data => {
  if (debug) {
    console.log("signing in");
  }
  const { config } = await getConfig();
  const { users } = await gets3Obj(config.usersKey, true).catch(err => {
    throw new Error(`Can't get users: ${err.message}`);
  });
  const user = getUser(users, data);
  if (user === false) {
    return responseBuilder("User not found.", 404);
  }

  const hmac = crypto.createHmac("sha256", config.configKey);
  hmac.update(data.pass);
  // console.log(hmac.digest('hex'))
  if (user.pass !== hmac.digest("hex")) {
    return responseBuilder("Incorrect password.", 401);
  } else {
    const { name, roles } = user;
    const auth = new Auth({}, config);
    const token = auth.sign({ user: { name, roles, username: data.username } });
    return responseBuilder("Successfully logged in.", 200, {
      authorization: token
    });
  }
};

const register = async (data, roles = []) => {
  if (debug) {
    console.log("registering");
  }
  const config = await getConfig();
  const { users } = await gets3Obj(config.usersKey, true).catch(err => {
    throw new Error(`Can't get users: ${err.message}`);
  });
  if (
    data.hasOwnProperty("username") &&
    data.hasOwnProperty("email") &&
    data.hasOwnProperty("pass") &&
    data.hasOwnProperty("name")
  ) {
    const user = getUser(users, data);
    if (user !== false) {
      return responseBuilder("Username or email already in use", 500);
    } else {
      const uid = uuid();
      const hmac = crypto.createHmac("sha256", config.configKey);
      hmac.update(data.pass);
      const pass = hmac.digest("hex");
      const uData = {
        username: data.username,
        email: data.email,
        pass,
        name: data.name,
        roles: roles || []
      };
      users[uid] = uData;
      await puts3Obj(JSON.stringify(users, null, 4), {
        key: config.usersKey
      }).catch(err => {
        return responseBuilder("Unable to register: " + err.message, 500);
      });

      delete uData.pass;
      delete uData.roles;
      return responseBuilder({ ...uData, id: uid }, 201);
    }
  } else {
    return responseBuilder("Missing properties needed to register", 500);
  }
};

const checkPerms = async data => {
  if (debug) {
    console.log(`checking permissions`);
  }
  const config = await getConfig();
  const { users } = await gets3Obj(config.usersKey, true).catch(err => {
    throw new Error(`Can't get users: ${err.message}`);
  });
  const user = getUser(users, data);
  if (!user) {
    throw new Error(`Unknown user: ${data.user}`);
  } else if (users[data.user].roles.indexOf(data.role) !== -1) {
    throw new Error(`Not Allowed`);
  } else {
    return responseBuilder("Allowed");
  }
};

module.exports = {
  signin,
  register,
  checkPerms
};
