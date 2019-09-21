module.exports = {
    checkUser: {
        type: 'object',
        attributes: ['user', 'role']
    },
    signin: {
        type: 'object',
        attributes: ['username','pass']
    },
    register: {
        type: 'object',
        attributes: ['username','email','name','pass']
    }
}