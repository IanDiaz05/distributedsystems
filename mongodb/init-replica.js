// Executed by mongosh only when the operator starts mongodb-init.
const members = ["mongodb:27017", "mongodb2:27017", "mongodb3:27017"];
const replicaSet = "store-rs";
// mongosh does not expose the server test harness's assert.commandWorked helper.
const commandWorked = (result) => {
  if (result?.ok !== 1) {
    const error = new Error(result?.errmsg || "MongoDB command failed");
    error.code = result?.code;
    throw error;
  }
  return result;
};
const authenticate = (connection) => {
  const admin = connection.getDB("admin");
  if (!admin.auth(process.env.MONGO_INITDB_ROOT_USERNAME, process.env.MONGO_INITDB_ROOT_PASSWORD)) {
    throw new Error("MongoDB authentication failed");
  }
  return admin;
};

let initialized = false;
for (let attempt = 0; attempt < 90; attempt += 1) {
  try {
    const admin = authenticate(new Mongo(`mongodb://${members[0]}/?directConnection=true`));
    let config;
    try {
      config = admin.runCommand({ replSetGetConfig: 1 });
    } catch (error) {
      if (error.code !== 94) throw error;
      config = { code: 94 };
    }
    if (config.code === 94) {
      commandWorked(admin.runCommand({
        replSetInitiate: {
          _id: replicaSet,
          members: members.map((host, _id) => ({ _id, host })),
        },
      }));
    } else {
      commandWorked(config);
      if (config.config._id !== replicaSet ||
          config.config.members.map((member) => member.host).sort().join() !== [...members].sort().join()) {
        throw new Error("Existing replica set differs from expected topology; manual review required");
      }
    }
    initialized = true;
    break;
  } catch (error) {
    if (attempt === 89) throw error;
    sleep(2000);
  }
}
if (!initialized) throw new Error("Replica set initialization timed out");

for (let attempt = 0; attempt < 90; attempt += 1) {
  try {
    const admin = authenticate(new Mongo(`mongodb://${members.join(",")}/?replicaSet=${replicaSet}`));
    const status = admin.runCommand({ replSetGetStatus: 1 });
    commandWorked(status);
    if (status.members.filter((member) => member.health === 1 && [1, 2].includes(member.state)).length === 3 &&
        status.members.some((member) => member.state === 1)) {
      print("MongoDB replica set ready: one primary and two secondaries");
      quit(0);
    }
  } catch (error) {
    if (attempt === 89) throw error;
  }
  sleep(2000);
}
throw new Error("Replica set did not become ready");
