const axios = require("axios");

const launchesDB = require("./launches.mongo");
const planets = require("./planets.mongo");

const DEFAULT_FLIGHT_NUMBER = 0;

const launch = {
  flightNumber: 100, //flight_number
  mission: "Kepler exploration X", //name
  rocket: "Explorar IS1", //rocket.name
  launchDate: new Date("December 27, 2030"), //date_local
  target: "Kepler-442 b", //not applicale
  customers: ["Nasa", "ZTM"], //payload.customers for each payload
  upcoming: true, //upcoming
  success: true, //success
};

saveLaunch(launch);

const SPACEX_API_URL = "https://api.spacexdata.com/v4/launches/query";

async function loadLaunchesData() {
  console.log("Downloading Launch data...");
  const response = await axios.post(SPACEX_API_URL, {
    query: {},
    options: {
      populate: [
        {
          path: "rocket",
          select: {
            name: 1,
          },
        },
        {
          path: "payloads",
          select: {
            customers: 1,
          },
        },
      ],
    },
  });
}

async function exitsLaunchWithId(launchId) {
  return await launchesDB.findOne({
    flightNumber: launchId,
  });
}

async function getAllLaunches() {
  return await launchesDB.find(
    {},
    //excludes mongo default attributes from being shown in the query
    {
      _id: 0,
      __v: 0,
    }
  );
}

async function getLatestFlightNumber() {
  const latestLaunch = await launchesDB.findOne().sort("-flightNumber");

  if (!latestLaunch) {
    return DEFAULT_FLIGHT_NUMBER;
  }

  return latestLaunch.flightNumber;
}

async function saveLaunch(launch) {
  const planet = await planets.find({
    keplerName: launch.target,
  });

  if (!planet) {
    throw new Error("No matching planet was found");
  }

  await launchesDB.findOneAndUpdate(
    {
      flightNumber: launch.flightNumber,
    },
    launch,
    {
      upsert: true,
    }
  );
}

async function scheduleNewLaunch(launch) {
  const newFlightNumber = (await getLatestFlightNumber()) + 1;

  const newLaunch = Object.assign(launch, {
    success: true,
    upcoming: true,
    customers: ["ZTM", "NASA"],
    flightNumber: newFlightNumber,
  });

  await saveLaunch(newLaunch);
}

async function abortLaunchById(launchId) {
  const aborted = await launchesDB.updateOne(
    {
      flightNumber: launchId,
    },
    {
      upcoming: false,
      success: false,
    }
  );

  return aborted.modifiedCount === 1;
}

module.exports = {
  loadLaunchesData,
  exitsLaunchWithId,
  getAllLaunches,
  scheduleNewLaunch,
  abortLaunchById,
};
