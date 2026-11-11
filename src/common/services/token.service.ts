import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';

export interface JwtSignOptions {
  secret: string;
  expiresIn?: string | number;
}

export interface JwtVerifyOptions {
  secret: string;
}

@Injectable()
export class TokenService {
  async signAsync(
    payload: string | Buffer | object,
    options: JwtSignOptions,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const { secret, expiresIn } = options;
      const signOptions: jwt.SignOptions = {};
      if (expiresIn) {
        signOptions.expiresIn = expiresIn as any;
      }

      jwt.sign(payload, secret, signOptions, (err, encoded) => {
        if (err || !encoded) {
          return reject(err);
        }
        resolve(encoded);
      });
    });
  }

  async verifyAsync<T extends object = any>(
    token: string,
    options: JwtVerifyOptions,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, options.secret, (err, decoded) => {
        if (err || !decoded) {
          return reject(err);
        }
        resolve(decoded as T);
      });
    });
  }
}

