function pad(num) {
  return String(num).padStart(2, '0');
}

function formatDate(date, format = 'YYYY-MM-DD') {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
}

function paramsToObject(query = '') {
  return query.split('&').reduce((result, current) => {
    if (!current) {
      return result;
    }

    const [key, value = ''] = current.split('=');
    result[key] = value;
    return result;
  }, {});
}

module.exports = {
  formatDate,
  paramsToObject
};
