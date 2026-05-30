const db = require('../config/dbConnection');
const wol = require('wake_on_lan');

// 🟢 REGISTER
exports.registerPc = async (req, res) => {
  try {
    const { pcId, pcName, ipAddress, macAddress, osInfo } = req.body;

    if (!pcId) {
      return res.status(400).json({ message: "pcId required" });
    }

    let pc = await db.PC.findOne({ where: { PcId: pcId } });

    if (!pc) {
      pc = await db.PC.create({
        PcId: pcId,
        PcName: pcName,
        IpAddress: ipAddress,
        MacAddress: macAddress,
        OsInfo: osInfo,
        Status: "online",
        LastSeen: db.sequelize.literal('GETDATE()'),
        Active: true
      });
      console.log(`✅ NEW PC: ${pcName}`);
    } else {
      await pc.update({
        PcName: pcName,
        IpAddress: ipAddress,
        MacAddress: macAddress,
        OsInfo: osInfo,
        Status: "online",
        LastSeen: db.sequelize.literal('GETDATE()')
      });
    }

    return res.json({ success: true, pcId });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

// 📋 LIST PCs
exports.listPcs = async (req, res) => {
  try {
    const pcs = await db.PC.findAll({
      where: { Active: true },
      raw: true,
      attributes: {
        include: [
          [
            db.sequelize.literal("DATEDIFF(SECOND, LastSeen, GETDATE())"),
            "secondsAgo"
          ]
        ]
      },
      order: [['PcName', 'ASC']]
    });

    const result = pcs.map(pc => {
      const secondsAgo = pc.secondsAgo;
      
      // Check if LastSeen is NULL or too old
      const isOffline = pc.LastSeen === null || (secondsAgo !== null && secondsAgo > 30);

      return {
        ...pc,
        Status: isOffline ? 'offline' : 'online'
      };
    });

    res.json({ success: true, pcs: result });
  } catch (err) {
    console.error("LIST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// 🎯 SEND COMMAND
exports.sendCommand = async (req, res) => {
  try {
    const { pcId, action } = req.body;

    const pc = await db.PC.findOne({ where: { PcId: pcId } });
    if (!pc) {
      return res.status(404).json({ message: 'PC not found' });
    }

    const isMac = pc.OsInfo?.toLowerCase().includes('darwin');

    // 🍎 MAC LOGIC
    if (isMac) {
      if (action === 'sleep') {
        // Mac display sleep - mark offline so Wake button shows
        await pc.update({ 
          PendingCommand: 'sleep',
          LastSeen: null,
          Status: 'offline'
        });

        return res.json({ 
          success: true,
          message: 'Display sleep command sent'
        });
      }

      // if (action === 'wakeup') {
      //   // Wake display via agent command
      //   await pc.update({ 
      //     PendingCommand: 'wakeup'
      //   });

      //   return res.json({ 
      //     success: true,
      //     message: 'Wake command sent'
      //   });
      // }
      if (action === 'wakeup') {
        // 1. Database Update (Taaki agent ko pata chale)
        await pc.update({ 
          PendingCommand: 'wakeup', 
          LastSeen: null 
        });
  
        // 2. Physical Wake-on-LAN Packet (Asli magic yahan hai)
        if (pc.MacAddress) {
          console.log(`🔌 Sending WOL to Mac: ${pc.PcName} (${pc.MacAddress})`);
          
          // Broadcast packet to everyone on the network
          wol.wake(pc.MacAddress, { address: '255.255.255.255', port: 9 }, (err) => {
            if (err) console.error("WOL Error:", err);
          });
  
          // Specific subnet broadcast (Optional but better reliability)
          if (pc.IpAddress) {
            const ipParts = pc.IpAddress.split('.');
            const broadcast = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.255`;
            wol.wake(pc.MacAddress, { address: broadcast, port: 9 });
          }
        } else {
          console.log("⚠️ Cannot send WOL: MacAddress missing in DB");
        }
  
        return res.json({ 
          success: true, 
          message: 'Wake-on-LAN packet sent and database updated' 
        });
      }
      if (action === 'shutdown') {
        await pc.update({ 
          PendingCommand: 'shutdown',
          LastSeen: null,
          Status: 'offline'
        });

        return res.json({ 
          success: true,
          message: 'Shutdown command sent'
        });
      }

      if (action === 'restart') {
        await pc.update({ PendingCommand: 'restart' });

        return res.json({ 
          success: true,
          message: 'Restart command sent'
        });
      }
    }

    // 🪟 WINDOWS / 🐧 LINUX LOGIC
    // if (action === 'wakeup') {
    //   // if (!pc.MacAddress) {
    //   //   return res.status(400).json({ message: 'MAC address missing' });
    //   // }

    //   console.log(`🔌 WOL → ${pc.PcName} (${pc.MacAddress})`);

    //   // Send WOL to multiple addresses
    //   wol.wake(pc.MacAddress, { address: '255.255.255.255', port: 9 });
    //   wol.wake(pc.MacAddress, { address: '255.255.255.255', port: 7 });

    //   const ipParts = pc.IpAddress?.split('.') || ['192', '168', '0', '0'];
    //   const broadcast = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.255`;
    //   wol.wake(pc.MacAddress, { address: broadcast, port: 9 });

    //   console.log(`   ✅ Sent to: ${broadcast}, 255.255.255.255`);

    //   return res.json({ 
    //     success: true,
    //     message: 'Wake-on-LAN sent'
    //   });
    // }
    // if (action === 'wakeup') {
    //   await pc.update({ PendingCommand: 'wakeup',LastSeen: null });
    //   return res.json({ success: true });
    // }
    if (action === 'wakeup') {
      if (!pc.MacAddress) {
        return res.status(400).json({ message: 'MAC address missing in DB' });
      }

      // MAC Address ko clean karein (Formatting issue hatane ke liye)
      const cleanMac = pc.MacAddress.trim(); 
      console.log(`🔌 Sending WOL to: ${pc.PcName} [${cleanMac}]`);

      // Database update (Taaki frontend pe status update ho)
      await pc.update({
        PendingCommand: 'wakeup',
        LastSeen: null,
        Status: 'offline'
      });

      // Packet 1: Global Broadcast (Sabse common)
      wol.wake(cleanMac, { address: '255.255.255.255', port: 9 });
      
      // Packet 2: Port 7 (Kuch purane cards ke liye)
      wol.wake(cleanMac, { address: '255.255.255.255', port: 7 });

      // Packet 3: Subnet Broadcast (IP ke hisaab se)
      if (pc.IpAddress && pc.IpAddress !== '0.0.0.0') {
        const ipParts = pc.IpAddress.split('.');
        if (ipParts.length === 4) {
          const broadcast = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.255`;
          wol.wake(cleanMac, { address: broadcast, port: 9 });
          console.log(`   ✅ Subnet broadcast sent to: ${broadcast}`);
        }
      }

      return res.json({ success: true, message: 'Wake-on-LAN packets sent' });
    }
    if (action === 'sleep' || action === 'shutdown') {
      await pc.update({ 
        PendingCommand: action,
        LastSeen: null,
        Status: 'offline'
      });

      return res.json({ 
        success: true,
        message: `${action} command sent`
      });
    }

    // Other commands
    await pc.update({ PendingCommand: action });
    
    res.json({ 
      success: true,
      message: `${action} command sent`
    });

  } catch (err) {
    console.error('SEND COMMAND ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};

// 🔁 POLL
exports.pollCommand = async (req, res) => {
  try {
    const pc = await db.PC.findByPk(req.params.pcId);
    
    if (!pc) {
      return res.status(404).json({ command: null });
    }

    const cmd = pc.PendingCommand;

    // Update status to online when agent polls
    await pc.update({
      PendingCommand: null,
      LastSeen: db.sequelize.literal('GETDATE()'),
      Status: 'online'
    });

    res.json({ command: cmd });
    
  } catch (err) {
    console.error('POLL ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};
// const db = require('../models');
// const wol = require('wake_on_lan');

// // 🟢 REGISTER / HEARTBEAT
// exports.registerPc = async (req, res) => {
//     try {
//       const { pcId, pcName, ipAddress, macAddress, osInfo } = req.body;
  
//       if (!pcId) {
//         return res.status(400).json({ message: "pcId required" });
//       }
  
//       // 🔍 1. First find
//       let pc = await db.PC.findOne({ where: { PcId: pcId } });
  
//       if (!pc) {
//         // ➕ 2. Create (NO transaction)
//         pc = await db.PC.create({
//           PcId: pcId,
//           PcName: pcName,
//           IpAddress: ipAddress,
//           MacAddress: macAddress,
//           OsInfo: osInfo,
//           Status: "online",
//           LastSeen: db.sequelize.literal('GETDATE()'),
//           Active: true
//         });
//       } else {
//         // 🔁 3. Update
//         await pc.update({
//           PcName: pcName,
//           IpAddress: ipAddress,
//           MacAddress: macAddress,
//           OsInfo: osInfo,
//           Status: "online",
//           LastSeen: db.sequelize.literal('GETDATE()')
//         });
//       }
  
//       return res.json({ success: true, pcId });
//     } catch (err) {
//       console.error("REGISTER PC ERROR:", err);
//       return res.status(500).json({ error: err.message });
//     }
//   };
  
//   // exports.listPcs = async (req, res) => {
//   //   const pcs = await db.PC.findAll({ where: { Active: true } });
//   //   res.json({ success: true, pcs });
//   // };
//   exports.listPcs = async (req, res) => {
//     const pcs = await db.PC.findAll({
//       where: { Active: true },
//       raw: true, // ⭐ IMPORTANT
//       attributes: {
//         include: [
//           [
//             db.sequelize.literal(
//               "DATEDIFF(SECOND, LastSeen, GETDATE())"
//             ),
//             "secondsAgo"
//           ]
//         ]
//       }
//     });
  
//     const result = pcs.map(pc => {
//       const secondsAgo = pc.secondsAgo;
  
//       return {
//         ...pc,
//         Status: secondsAgo !== null && secondsAgo <= 30
//           ? 'online'
//           : 'offline'
//       };
//     });
  
//     res.json({ success: true, pcs: result });
//   };
//   exports.sendCommand = async (req, res) => {
//     const { pcId, action } = req.body;
//     const pc = await db.PC.findOne({ where: { PcId: pcId } });
  
//     if (!pc) return res.status(404).json({ message: 'PC not found' });
  
//     const isMac = pc.OsInfo?.toLowerCase().includes('darwin');
  
//     // 🍎 MAC
//     if (isMac) {
//       if (action === 'sleep') {
//         await pc.update({
//           PendingCommand: 'sleep',
//           LastSeen: null,        // ⭐ IMPORTANT
//           Status: 'offline'      // ⭐ IMPORTANT
//         });
  
//         return res.json({ success: true });
//       }
  
//       if (action === 'wakeup') {
//         wol.wake(pc.MacAddress);
//         return res.json({ success: true });
//       }
  
//       if (action === 'shutdown') {
//         return res.status(400).json({
//           message: 'Mac shutdown not supported'
//         });
//       }
//     }
  
//     // 🪟 WINDOWS
//     if (action === 'sleep') {
//       await pc.update({
//         PendingCommand: 'sleep',
//         LastSeen: null,        // ⭐ SAME LOGIC
//         Status: 'offline'
//       });
  
//       return res.json({ success: true });
//     }
  
//     if (action === 'wakeup') {
//       wol.wake(pc.MacAddress);
//       return res.json({ success: true });
//     }
  
//     await pc.update({ PendingCommand: action });
//     res.json({ success: true });
//   };
// //   exports.sendCommand = async (req, res) => {
// //   const { pcId, action } = req.body;
// //   const pc = await db.PC.findOne({ where: { PcId: pcId } });

// //   if (!pc) return res.status(404).json({ message: "PC not found" });

// //   const isMac = pc.OsInfo?.toLowerCase().includes("darwin");

// //   // 🍎 MAC — DISPLAY OFF ONLY
// //   if (isMac) {
// //     if (action === "sleep" || action === "wakeup" || action === "restart") {
// //       await pc.update({
// //         PendingCommand: action,
// //         Status: "online"   // ⭐ NEVER offline
// //       });
// //       return res.json({ success: true });
// //     }

// //     if (action === "shutdown") {
// //       return res.status(400).json({
// //         message: "Mac shutdown disabled"
// //       });
// //     }
// //   }

// //   // 🪟 WINDOWS / 🐧 LINUX
// //   if (action === "sleep" || action === "shutdown") {
// //     await pc.update({
// //       PendingCommand: action,
// //       Status: "offline"
// //     });
// //     return res.json({ success: true });
// //   }

// //   if (action === "wakeup") {
// //     wol.wake(pc.MacAddress);
// //     return res.json({ success: true });
// //   }

// //   await pc.update({ PendingCommand: action });
// //   res.json({ success: true });
// // };

  
//   // exports.sendCommand = async (req, res) => {
//   //   const { pcId, action } = req.body;
  
//   //   const pc = await db.PC.findOne({ where: { PcId: pcId } });
//   //   if (!pc) return res.status(404).json({ message: 'PC not found' });
  
//   //   // 🍎 MAC LOGIC
//   //   if (pc.OsInfo.toLowerCase().includes('darwin')) {
//   //     if (action === 'shutdown') {
//   //       return res.status(400).json({
//   //         message: 'Mac shutdown not supported. Use sleep.'
//   //       });
//   //     }
  
//   //     if (action === 'wakeup') {
//   //       // wake = WOL only works from sleep
//   //       wol.wake(pc.MacAddress);
//   //       return res.json({ success: true, mode: 'mac-wake' });
//   //     }
  
//   //     // sleep command
//   //     await pc.update({ PendingCommand: 'sleep' });
//   //     return res.json({ success: true, mode: 'mac-sleep' });
//   //   }
  
//   //   // 🪟 WINDOWS / LINUX LOGIC
//   //   if (action === 'wakeup') {
//   //     wol.wake(pc.MacAddress);
//   //     return res.json({ success: true, mode: 'wol' });
//   //   }
  
//   //   await pc.update({ PendingCommand: action });
//   //   res.json({ success: true });
//   // };
  
// // 📋 LIST PCs
// // exports.listPcs = async (req, res) => {
// //     const pcs = await db.PC.findAll({ where: { Active: true } });

// //     const now = Date.now();
// //     for (const pc of pcs) {
// //         if (pc.LastSeen && now - new Date(pc.LastSeen).getTime() > 30000) {
// //             if (pc.Status !== 'offline') {
// //                 await pc.update({ Status: 'offline' });
// //             }
// //         }
// //     }

// //     res.json({ success: true, pcs });
// // };

// // 🎯 SEND COMMAND
// // exports.sendCommand = async (req, res) => {
// //     const { pcId, action } = req.body;
// //     const pc = await db.PC.findByPk(pcId);

// //     if (!pc) return res.status(404).json({ message: 'PC not found' });

// //     if (action === 'wakeup') {
// //         if (!pc.MacAddress) {
// //             return res.status(400).json({ message: 'MAC address missing' });
// //         }
// //         wol.wake(pc.MacAddress);
// //         await pc.update({ Status: 'waking' });
// //         return res.json({ success: true });
// //     }

// //     await pc.update({ PendingCommand: action });
// //     res.json({ success: true });
// // };

// // 🔁 POLL (AGENT)
// exports.pollCommand = async (req, res) => {
//     const pc = await db.PC.findByPk(req.params.pcId);
//     if (!pc) return res.status(404).json({ command: null });

//     const cmd = pc.PendingCommand;

//     await pc.update({
//         PendingCommand: null,
//         LastSeen: db.sequelize.literal('GETDATE()'),
//         Status: 'online'
//     });

//     res.json({ command: cmd });
// };

