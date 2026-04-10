module.exports = {
  apps: [{
    name: 'edwardian-api',
    script: 'server.js',
    cwd: '/var/www/edwardian-academy-erp/backend',
    env: {
      NODE_ENV: 'production',
      PORT: '5000',
      COOKIE_SAME_SITE: 'lax',
      COOKIE_SECURE: 'true',
      COOKIE_DOMAIN: '.edwardiansacademy.com',
      STUDENT_COOKIE_SAME_SITE: 'lax',
      STUDENT_COOKIE_SECURE: 'true'
    }
  }]
}
