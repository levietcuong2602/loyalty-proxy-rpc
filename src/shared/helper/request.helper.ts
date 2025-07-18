import { UnauthorizedException } from '@nestjs/common';

export function getJwtFromAuthorizationHeader(authorizationHeader: string) {
  if (authorizationHeader.startsWith('Bearer ')) {
    return authorizationHeader.substring(7, authorizationHeader.length);
  }
  throw new UnauthorizedException();
}
