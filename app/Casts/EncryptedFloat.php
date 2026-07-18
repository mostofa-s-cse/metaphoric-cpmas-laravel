<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

class EncryptedFloat implements CastsAttributes
{
    /**
     * @param string|null $shadowColumn Optional plaintext decimal column
     * (e.g. 'amountNumeric') kept in sync on every set() so SQL SUM/GROUP BY
     * can aggregate this amount without decrypting every row in PHP.
     */
    public function __construct(private ?string $shadowColumn = null)
    {
    }

    private function getSecretKey(): string
    {
        $rawKey = env('ENCRYPTION_KEY', 'v3y-s3cr3t-k3y-32-bytes-long-123');
        // Replicate crypto.createHash('sha256').update(rawKey).digest()
        return hash('sha256', $rawKey, true);
    }

    /**
     * Cast the given value (Decrypt from DB)
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): float
    {
        if (empty($value) || !str_contains($value, ':')) {
            return (float) ($value ?? 0.0);
        }

        try {
            $parts = explode(':', $value);
            $iv = hex2bin($parts[0]);
            $ciphertext = hex2bin($parts[1]);

            $decrypted = openssl_decrypt(
                $ciphertext,
                'aes-256-cbc',
                $this->getSecretKey(),
                OPENSSL_RAW_DATA,
                $iv
            );

            if ($decrypted === false) {
                return (float) $value;
            }

            return (float) $decrypted;
        } catch (\Exception $e) {
            return (float) $value;
        }
    }

    /**
     * Prepare the given value for storage (Encrypt to DB)
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): array|string
    {
        if ($value === null || $value === '') {
            return $this->shadowColumn ? [$key => '', $this->shadowColumn => 0] : '';
        }

        $strVal = (string) $value;
        $ivLength = openssl_cipher_iv_length('aes-256-cbc');
        $iv = openssl_random_pseudo_bytes($ivLength);

        $encrypted = openssl_encrypt(
            $strVal,
            'aes-256-cbc',
            $this->getSecretKey(),
            OPENSSL_RAW_DATA,
            $iv
        );

        $encoded = bin2hex($iv) . ':' . bin2hex($encrypted);

        if ($this->shadowColumn) {
            return [$key => $encoded, $this->shadowColumn => round((float) $strVal, 2)];
        }

        return $encoded;
    }
}
