const fs = require('fs');
let code = fs.readFileSync('lib/screens/dashboard_screen.dart', 'utf8');

code = code.replace(/_NearbyClinicsWidget\(\),/g, 'Container(),');
code = code.replace(/_QueueAlertNotification\(\),/g, 'Container(),');
code = code.replace(/const _NearbyClinicsWidget\(\),/g, 'Container(),');

fs.writeFileSync('lib/screens/dashboard_screen.dart', code);
