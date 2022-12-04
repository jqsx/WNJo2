module.exports = {
    port: 3000,
    WorldSettings: { // this information will be sent to the main server on startup of the server
        ServerName: "WNJO Server",
        Description: "A WNJO server",
        WorldSeed: 1234, // replace with a number
        WorldSize: 5000,
        PlayerCap: 100
    }
}

/** REQUIRE NODE 17.5+
 * npm imports:
 * - uuid
 * - ws
 * - simplex noise
 */