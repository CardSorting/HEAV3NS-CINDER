/** [LAYER: DOMAIN] */

/**
 * Pure Domain Entity: Conference Agenda Session.
 * Zero I/O.
 */
export class Session {
  /**
   * @param {Object} props
   * @param {string} props.id
   * @param {string} props.title
   * @param {string[]} [props.speakers=[]]
   * @param {string} props.startTime
   * @param {string} props.endTime
   * @param {string} props.room
   * @param {string} [props.track=""]
   * @param {string} [props.description=""]
   */
  constructor({
    id,
    title,
    speakers = [],
    startTime,
    endTime,
    room,
    track = "",
    description = ""
  }) {
    if (!id || !title || !startTime || !endTime || !room) {
      throw new Error("Session requires id, title, startTime, endTime, and room");
    }

    this.id = id;
    this.title = title;
    this.speakers = [...speakers];
    this.startTime = startTime;
    this.endTime = endTime;
    this.room = room;
    this.track = track;
    this.description = description;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      speakers: this.speakers,
      startTime: this.startTime,
      endTime: this.endTime,
      room: this.room,
      track: this.track,
      description: this.description
    };
  }
}

