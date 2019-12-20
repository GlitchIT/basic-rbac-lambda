const { debug } = require("./runtime");
const AWS = require("aws-sdk");
AWS.config.apiVersions = {
  s3: "2006-03-01"
  // other service API versions
};
// get reference to S3 client
var s3 = new AWS.S3();

let configCache = null;
let settingsCache = null;

/**
 * @param objKey
 * @param isJson
 * @returns mixed
 *
 */
const gets3Obj = async (objKey, isJson = false) => {
  const bconfig = await s3
    .getObject({
      Bucket: process.env.bucket,
      Key: objKey
    })
    .promise()
    .catch(err => {
      throw err;
    });
  if (debug) {
    console.log(`Retrieved s3 obj: ${objKey}`);
  }
  try {
    let object = bconfig.Body.toString();
    if (isJson && object) {
      object = JSON.parse(object);
    }
    return object;
  } catch (e) {
    throw e;
  }
};

/**
 * @param objKey
 * @param isJson
 * @returns mixed
 *
 */
const puts3Obj = async (
  data,
  { key, filename = new Date().toISOString(), path = "media/" }
) => {
  return await s3
    .putObject({
      Body: data,
      Bucket: process.env.bucket,
      Key: key ? key : path + filename
    })
    .promise()
    .catch(err => {
      throw err;
    });
};

/**
 *
 * @param body
 * @param statusCode
 * @param headers
 * @returns {{headers, body: string, statusCode: number}}
 */
const responseBuilder = (body, statusCode = 200, headers = {}) => ({
  statusCode,
  headers,
  body: typeof body !== "string" ? JSON.stringify(body) : body
});

const getConfig = async () => {
  if (debug) {
    console.log("getting config");
  }
  let config;
  let settings;

  if (configCache === null) {
    config = await gets3Obj("config.json", true).catch(err => {
      throw new Error("Can't get default config for site: " + err.message);
    });
    configCache = config;

    if (debug) {
      console.log("got config, getting settings");
    }
  } else {
    config = configCache;
  }

  if (settingsCache === null) {
    settings = await gets3Obj(config.settingsKey, true).catch(err => {
      console.log("Can't get settings: " + err.message);
    });
    settingsCache = settings;

    if (debug) {
      console.log("got settings, is " + typeof settings);
    }
  } else {
    settings = settingsCache;
  }

  return {
    ...config,
    settings: settings || {}
  };
};

module.exports = {
  gets3Obj,
  responseBuilder,
  getConfig,
  puts3Obj
};
