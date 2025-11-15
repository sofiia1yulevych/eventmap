fetch("get_events.php")
    .then(res => res.json())
    .then(events => {
        console.log(events);
        const list = document.getElementById("event-list");

        events.forEach(ev => {
            const div = document.createElement("div");
            div.className = "event";

            div.innerHTML = `
              <h3>${ev.name}</h3>
              <p>${ev.description || ""}</p>
              <p><b>Von:</b> ${ev.start_date}</p>
              <p><b>Bis:</b> ${ev.end_date}</p>
          `;

            list.appendChild(div);
        });
    });
