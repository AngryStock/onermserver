export function logincheck1(req, res, next) {
  if (req.user) {
    res.redirect('/routine');
    return false;
  } else {
    next();
    return true;
  }
}
export function logincheck2(req, res, next) {
  if (req.user) {
    next();
    return true;
  } else {
    res.redirect('/auth/login');
    return false;
  }
}
export function managercheck(req, res, next) {
  if (!req.user) {
    res.redirect('/auth/login');
    return false;
  } else if (req.user.email == 'myid7771@gmail.com') {
    next();
    return true;
  } else {
    res.redirect('/routine');
    return false;
  }
}
