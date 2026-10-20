import type { Types } from 'mongoose';
import { Session, type SessionDoc } from './session.model.js';
import type { CreateSessionInput } from './session.schemas.js';

export type NewSession = CreateSessionInput;
export type SessionRecord = SessionDoc & { _id: Types.ObjectId };

export type SessionRepository = {
  create(input: NewSession): Promise<SessionRecord>;
};

export const sessionRepository: SessionRepository = {
  async create({ teacherId, startTime, endTime }) {
    return (await Session.create({ teacherId, startTime, endTime })).toObject();
  },
};
