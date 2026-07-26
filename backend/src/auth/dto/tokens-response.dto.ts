export class TokensResponseDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number; // seconds
}