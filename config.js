module.exports = {
  mysql: {
    database: 'concours',
    username: 'root',
    password: 'meimid123',
    host: '10.1.230.207',
    port: 3306,
    dialect: 'mysql'
  },
  mongo: {
    uri: 'mongodb://root:meimid@10.1.241.178:27017/concours?authSource=admin'
    // uri: 'mongodb://root:meimid@10.1.230.13:27017/concours?authSource=admin'
    // uri: 'mongodb://root:meimid@10.1.230.207:27017/concours?authSource=admin'
  }
};
