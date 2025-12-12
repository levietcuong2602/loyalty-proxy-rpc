import { Cache } from 'cache-manager';
import { TTL_30S } from './caching.constant';

export abstract class CachingService {
  protected constructor(public cacheManager: Cache) {}

  async del(identity: string): Promise<void> {
    await this.cacheManager.del(this.constructIdentity(identity));
  }

  /**
   * Retrieve the cached value via cache-key.
   * @param identity a caching key for redis to store the value.
   */
  get<T extends any = string>(
    identity: string,
  ): Promise<T | undefined> | T | undefined {
    return this.cacheManager.get<T>(this.constructIdentity(identity));
  }

  /**
   * Set the value to Redis.
   * @param identity A caching key for redis to store the value.
   * @param value The original value. Prefer `string` | `number` | `Buffer`.
   * @param opts Caching option.
   * @param opts.ttl Time to cache the data (in second). Default `undefined`, which is not to be expired.
   */
  async set<T>(
    identity: string,
    value: T,
    opts?: {
      // in seconds
      ttl?: number;
    },
  ): Promise<boolean> {
    await this.cacheManager.set(this.constructIdentity(identity), value, {
      ttl: opts?.ttl ?? TTL_30S,
    });
    return true;
  }

  /**
   * Retrieve the actual key stored in the redis.
   * The actual key has a prefix which is the service identity.
   * @param rawIdentity
   * @private
   */
  protected constructIdentity(rawIdentity: string) {
    return rawIdentity;
  }
}
