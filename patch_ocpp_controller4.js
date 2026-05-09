const fs = require('fs');
let content = fs.readFileSync('/app/Backend/src/api/ocpp/ocpp.controller.ts', 'utf8');

const search = `      const groupUser = await prisma.chargeGroupUser.findUnique({
        where: {
          chargeGroupId_userId: {
            chargeGroupId: charger.chargeGroupId,
            userId: rfidUser.owner_id
          }
        }
      });`;

const replace = `      if (!rfidUser.owner_id) {
         return res.json({
           success: true,
           valid: false,
           message: "Tag is not assigned to any user"
         });
      }

      const groupUser = await prisma.chargeGroupUser.findUnique({
        where: {
          chargeGroupId_userId: {
            chargeGroupId: charger.chargeGroupId,
            userId: rfidUser.owner_id
          }
        }
      });`;

if (content.includes(search)) {
    content = content.replace(search, replace);
}

fs.writeFileSync('/app/Backend/src/api/ocpp/ocpp.controller.ts', content);
