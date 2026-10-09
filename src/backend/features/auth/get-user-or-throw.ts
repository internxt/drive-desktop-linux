import { getUser } from './get-user';


export function getUserOrThrow() {
    const { data: user, error } = getUser();
    if (error) throw error;

    return user;
}