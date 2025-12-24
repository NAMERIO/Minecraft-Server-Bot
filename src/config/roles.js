const { env } = require('./env');

function hasModRole(member) {
  return member.roles.cache.has(env.MOD_ROLE_ID) || hasAdminRole(member);
}

function hasAdminRole(member) {
  return member.roles.cache.has(env.ADMIN_ROLE_ID);
}

module.exports = {
  hasModRole,
  hasAdminRole
};