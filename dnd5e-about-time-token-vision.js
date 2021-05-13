/* Token Vision
 * 
 * Dependencies:
 * Tim Posney's "About Time" module - https://foundryvtt.com/packages/about-time/
 *
 * Description:
 * After selecting a token, running this macro creates a popup menu for configuring token vision and light settings
 * The options are compatible with the dnd5e system and include configurations for darkvision, miscellanious light sources
 * Entering a duration hooks into About Time in order to expire the lighting
 * However, a duration is optional
 */


if (canvas.tokens.controlled.length === 0) {
  ui.notifications.error("Please select a token");
} else {
  let namedfields = (...fields) => {
    return (...arr) => {
      var obj = {};
      fields.forEach((field, index) => {
        obj[field] = arr[index];
      });
      return obj;
    };
  };

  // Generate a list of visions supported by the macro, darkvision in units of 30 feet (maximum 180 feet)
  let VisionType = namedfields('name', 'dim', 'bright');
  var visions = (() => {
    return [
      VisionType('Leave Unchanged', null, null),
      VisionType('Self', 5, 0),
      VisionType('Devil\'s Sight', 0, 120)
    ].concat(...[...Array(6).keys()].map(x => (x+1)*30).map(n => {
      return VisionType(`Darkvision (${n} feet)`, n, 0);
    }));
  })();

  // Manually create the list of sources of light a character may be holding
  let LightSource = namedfields('name', 'dim', 'bright', 'angle', 'lockRotation')
  var lightSources = [
    LightSource('Leave Unchanged', null, null, null, null),
    LightSource('None', 0, 0, 360, null),
    LightSource('Candle', 10, 5, 360, null),
    LightSource('Torch / Light Cantrip', 40, 20, 360, null),
    LightSource('Lamp', 45, 15, 360, null),
    LightSource('Hooded Lantern', 60, 30, 360, null),
    LightSource('Hooded Lantern (Dim)', 5, 0, 360, null),
    LightSource('Bullseye Lantern', 120, 60, 52.5, false)
  ];

  // Generate the dialog for user input
  let applyChanges = false;
  new Dialog({
    title: `Token Vision Configuration`,
    content: `
  <form>
    <div class="form-group">
      <label>Vision Type:</label>
      <select id="vision-type" name="vision-type">
        ${
          visions.map((vision, index) => {
            return `\t<option value=${index}>${vision.name}</option>`;
          }).join('\n')
        }
      </select>
    </div>
    <div class="form-group">
      <label>Light Source:</label>
      <select id="light-source" name="light-source">
        ${
          lightSources.map((lightSource, index) => {
            return `\t<option value=${index}>${lightSource.name}</option>`;
          }).join('\n')
        }
      </select>
    </div>
    <div class="form-group">
      <label>Duration in Minutes:</label>
      <input type="number" id="duration" name="duration" min="0">
    </div>
  </form>
  `,
    buttons: {
      yes: {
        icon: "<i class='fas fa-check'></i>",
        label: `Apply Changes`,
        callback: () => applyChanges = true
      },
      no: {
        icon: "<i class='fas fa-times'></i>",
        label: `Cancel Changes`
      },
    },
    default: "yes",

    // Only the close handler receives the dialog's html (and by extension the user input)
    // so confirm that it is closing after the user clicked the "apply changes" button
    // then register the vision, lighting, and a handler in about-time to reset their values
    close: html => {
      if (applyChanges) {
        for ( let token of canvas.tokens.controlled ) {
          let visionIndex = parseInt(html.find('[name="vision-type"]')[0].value) || 0;
          let lightIndex = parseInt(html.find('[name="light-source"]')[0].value) || 0;
          let duration = parseInt(html.find('[name="duration"]')[0].value) || 0;

          if (duration > 0) {
            let about_time_mod = game.modules.get("about-time");

            if (about_time_mod === undefined) {
              ui.notifications.error("Please install and activate the About Time module to use the duration field!");
            } else if (about_time_mod.active != true) {
              ui.notifications.error("Please activate the About Time module to use the duration field!");
            } else {

              // A closure allows either handler to access information about the token that they are handling
              // The handlers need to be registered before the token vision/light data is overwritten and both need to receive a deep clone of that data

              // The first handler is a warning that time is running out, firing when only 1/4 of the duration remains
              // It write a warning to the chat window
              ((backup) => {
                game.Gametime.doIn({minutes:Math.floor(3 * duration / 4)}, () => {
                  ChatMessage.create({
                    user: game.user._id,
                    content: "The fire burns low...",
                    speaker: speaker
                  }, {});
                });
              })(Object.assign({}, token.data));

              // The second handler is the out of time handler, firing when the duration has run out
              // It resets the vision and light settings, then writes a notice to the chat window
              ((backup) => {
                game.Gametime.doIn({minutes:duration}, () => {
                  ChatMessage.create({
                    user: game.user._id,
                    content: "The fire goes out, leaving you in darkness.",
                    speaker: speaker
                  }, {});
                  token.update({
                    vision: true,
                    dimSight: backup.dimSight,
                    brightSight: backup.brightSight,
                    dimLight: backup.dimLight,
                    brightLight:  backup.brightLight,
                    lightAngle: backup.lightAngle,
                    lockRotation: backup.lockRotation
                  });
                });
              })(Object.assign({}, token.data));
            }
          }

          // Configure new token vision if the light or vision has data for that field
          // nulls indicate no change and instead re-use the existing data for the token
          let dimSight = visions[visionIndex].dim ?? token.data.dimSight;
          let brightSight = visions[visionIndex].bright ?? token.data.brightSight;
          let dimLight = lightSources[lightIndex].dim ?? token.data.dimLight;
          let brightLight = lightSources[lightIndex].bright ?? token.data.brightLight;
          let lightAngle = lightSources[lightIndex].angle ?? token.data.lightAngle;
          let lockRotation = lightSources[lightIndex].lockRotation ?? token.data.lockRotation;

          // Update the token
          console.log(token);
          token.update({
            vision: true,
            dimSight: dimSight,
            brightSight: brightSight,
            dimLight: dimLight,
            brightLight:  brightLight,
            lightAngle: lightAngle,
            lockRotation: lockRotation
          });
        }
      }
    }
  }).render(true);
}