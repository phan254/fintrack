<?php

namespace App;

use OpenApi\Attributes as OA;

#[OA\Info(
    title: 'FinTrack API',
    version: '1.0.0',
    description: 'REST API for managing investment portfolios, transactions, and holdings.'
)]
#[OA\Server(
    url: 'http://127.0.0.1:8000/api',
    description: 'Local development server'
)]
#[OA\SecurityScheme(
    securityScheme: 'sanctum',
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'Bearer token',
    description: 'Enter your Laravel Sanctum API token'
)]

// AUTHENTICATION

#[OA\Post(
    path: '/auth/register',
    operationId: 'registerUser',
    tags: ['Authentication'],
    summary: 'Register a new user',
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['name', 'email', 'password', 'password_confirmation'],
            properties: [
                new OA\Property(property: 'name', type: 'string', example: 'John Doe'),
                new OA\Property(property: 'email', type: 'string', format: 'email', example: 'john@example.com'),
                new OA\Property(property: 'password', type: 'string', format: 'password', example: 'Password123'),
                new OA\Property(property: 'password_confirmation', type: 'string', format: 'password', example: 'Password123')
            ]
        )
    ),
    responses: [
        new OA\Response(response: 201, description: 'Registration successful'),
        new OA\Response(response: 422, description: 'Validation error')
    ]
)]

#[OA\Post(
    path: '/auth/login',
    operationId: 'loginUser',
    tags: ['Authentication'],
    summary: 'Log in and receive an API token',
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['email', 'password'],
            properties: [
                new OA\Property(property: 'email', type: 'string', format: 'email', example: 'john@example.com'),
                new OA\Property(property: 'password', type: 'string', format: 'password', example: 'Password123')
            ]
        )
    ),
    responses: [
        new OA\Response(response: 200, description: 'Login successful'),
        new OA\Response(response: 422, description: 'Invalid credentials or validation error')
    ]
)]

#[OA\Get(
    path: '/auth/me',
    operationId: 'getAuthenticatedUser',
    tags: ['Authentication'],
    summary: 'Get the authenticated user',
    security: [['sanctum' => []]],
    responses: [
        new OA\Response(response: 200, description: 'Authenticated user details'),
        new OA\Response(response: 401, description: 'Unauthenticated')
    ]
)]

#[OA\Post(
    path: '/auth/logout',
    operationId: 'logoutUser',
    tags: ['Authentication'],
    summary: 'Log out and revoke the current API token',
    security: [['sanctum' => []]],
    responses: [
        new OA\Response(response: 200, description: 'Logged out successfully'),
        new OA\Response(response: 401, description: 'Unauthenticated')
    ]
)]

// PORTFOLIOS

#[OA\Get(
    path: '/portfolios',
    operationId: 'getPortfolios',
    tags: ['Portfolios'],
    summary: 'List the authenticated user portfolios',
    security: [['sanctum' => []]],
    responses: [
        new OA\Response(
            response: 200,
            description: 'Portfolios retrieved successfully',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'message', type: 'string', example: 'Portfolios retrieved successfully.'),
                    new OA\Property(
                        property: 'data',
                        type: 'array',
                        items: new OA\Items(type: 'object')
                    )
                ]
            )
        ),
        new OA\Response(response: 401, description: 'Unauthenticated')
    ]
)]

#[OA\Post(
    path: '/portfolios',
    operationId: 'createPortfolio',
    tags: ['Portfolios'],
    summary: 'Create a new portfolio',
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['name', 'currency', 'initial_balance'],
            properties: [
                new OA\Property(property: 'name', type: 'string', maxLength: 255, example: 'My Investment Portfolio'),
                new OA\Property(property: 'client_name', type: 'string', nullable: true, example: 'John Doe'),
                new OA\Property(property: 'description', type: 'string', nullable: true, example: 'Long-term investments'),
                new OA\Property(property: 'currency', type: 'string', minLength: 3, maxLength: 3, example: 'KES'),
                new OA\Property(property: 'initial_balance', type: 'number', format: 'double', minimum: 0, example: 100000)
            ]
        )
    ),
    responses: [
        new OA\Response(response: 201, description: 'Portfolio created successfully'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 422, description: 'Validation error')
    ]
)]

#[OA\Get(
    path: '/portfolios/{portfolio}',
    operationId: 'getPortfolio',
    tags: ['Portfolios'],
    summary: 'Get one portfolio with its transactions and holdings',
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'portfolio',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer'),
            example: 1
        )
    ],
    responses: [
        new OA\Response(response: 200, description: 'Portfolio retrieved successfully'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 404, description: 'Portfolio not found')
    ]
)]

#[OA\Put(
    path: '/portfolios/{portfolio}',
    operationId: 'updatePortfolio',
    tags: ['Portfolios'],
    summary: 'Update a portfolio',
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'portfolio',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer'),
            example: 1
        )
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'name', type: 'string', maxLength: 255, example: 'Updated Portfolio'),
                new OA\Property(property: 'client_name', type: 'string', nullable: true, example: 'John Doe'),
                new OA\Property(property: 'description', type: 'string', nullable: true, example: 'Updated description'),
                new OA\Property(property: 'currency', type: 'string', minLength: 3, maxLength: 3, example: 'KES'),
                new OA\Property(property: 'initial_balance', type: 'number', format: 'double', minimum: 0, example: 150000)
            ]
        )
    ),
    responses: [
        new OA\Response(response: 200, description: 'Portfolio updated successfully'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 404, description: 'Portfolio not found'),
        new OA\Response(response: 422, description: 'Validation error')
    ]
)]

#[OA\Delete(
    path: '/portfolios/{portfolio}',
    operationId: 'deletePortfolio',
    tags: ['Portfolios'],
    summary: 'Delete a portfolio',
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(
            name: 'portfolio',
            in: 'path',
            required: true,
            schema: new OA\Schema(type: 'integer'),
            example: 1
        )
    ],
    responses: [
        new OA\Response(response: 200, description: 'Portfolio deleted successfully'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 404, description: 'Portfolio not found')
    ]
)]

// TRANSACTIONS

#[OA\Get(
    path: '/transactions',
    operationId: 'getTransactions',
    tags: ['Transactions'],
    summary: 'List transactions with optional filters',
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'portfolio_id', in: 'query', schema: new OA\Schema(type: 'integer')),
        new OA\Parameter(name: 'type', in: 'query', schema: new OA\Schema(type: 'string', enum: ['income', 'expense', 'buy', 'sell'])),
        new OA\Parameter(name: 'category', in: 'query', schema: new OA\Schema(type: 'string')),
        new OA\Parameter(name: 'search', in: 'query', schema: new OA\Schema(type: 'string')),
        new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer', minimum: 1))
    ],
    responses: [
        new OA\Response(response: 200, description: 'Transactions retrieved successfully. Paginated results.'),
        new OA\Response(response: 401, description: 'Unauthenticated')
    ]
)]

#[OA\Post(
    path: '/transactions',
    operationId: 'createTransaction',
    tags: ['Transactions'],
    summary: 'Create an income, expense, BUY or SELL transaction',
    security: [['sanctum' => []]],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            required: ['portfolio_id', 'type'],
            properties: [
                new OA\Property(property: 'portfolio_id', type: 'integer', example: 1),
                new OA\Property(property: 'type', type: 'string', enum: ['income', 'expense', 'buy', 'sell'], example: 'buy'),
                new OA\Property(property: 'name', type: 'string', nullable: true, example: 'BUY KCB Group'),
                new OA\Property(property: 'category', type: 'string', nullable: true, example: 'Shares'),
                new OA\Property(property: 'amount', type: 'number', nullable: true, example: 1000),
                new OA\Property(property: 'transaction_date', type: 'string', format: 'date', nullable: true, example: '2026-11-24'),
                new OA\Property(property: 'instrument', type: 'string', enum: ['SCOM', 'KCB', 'EQTY', 'T-BILL-91'], nullable: true, example: 'KCB'),
                new OA\Property(property: 'quantity', type: 'number', format: 'double', nullable: true, example: 10),
                new OA\Property(property: 'unit_price', type: 'number', format: 'double', nullable: true, example: 42.5),
                new OA\Property(property: 'trade_date', type: 'string', format: 'date', nullable: true, example: '2026-11-24'),
                new OA\Property(property: 'description', type: 'string', nullable: true),
                new OA\Property(property: 'status', type: 'string', enum: ['pending', 'completed', 'failed'], nullable: true, example: 'completed')
            ]
        )
    ),
    responses: [
        new OA\Response(response: 201, description: 'Transaction created successfully'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 404, description: 'Portfolio not found or inaccessible'),
        new OA\Response(response: 422, description: 'Validation error, unsupported instrument or insufficient holdings')
    ]
)]

#[OA\Get(
    path: '/transactions/{transaction}',
    operationId: 'getTransaction',
    tags: ['Transactions'],
    summary: 'Get one transaction',
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'transaction', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
    ],
    responses: [
        new OA\Response(response: 200, description: 'Transaction retrieved successfully'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 404, description: 'Transaction not found')
    ]
)]

#[OA\Put(
    path: '/transactions/{transaction}',
    operationId: 'updateTransaction',
    tags: ['Transactions'],
    summary: 'Update an income or expense transaction',
    description: 'Investment BUY and SELL transactions cannot be edited.',
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'transaction', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
    ],
    requestBody: new OA\RequestBody(
        required: true,
        content: new OA\JsonContent(
            properties: [
                new OA\Property(property: 'portfolio_id', type: 'integer', example: 1),
                new OA\Property(property: 'name', type: 'string', example: 'Monthly Salary'),
                new OA\Property(property: 'category', type: 'string', example: 'Salary'),
                new OA\Property(property: 'type', type: 'string', enum: ['income', 'expense']),
                new OA\Property(property: 'amount', type: 'number', example: 85000),
                new OA\Property(property: 'transaction_date', type: 'string', format: 'date', example: '2026-11-24'),
                new OA\Property(property: 'description', type: 'string', nullable: true),
                new OA\Property(property: 'status', type: 'string', enum: ['pending', 'completed', 'failed'])
            ]
        )
    ),
    responses: [
        new OA\Response(response: 200, description: 'Transaction updated successfully'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 404, description: 'Transaction or portfolio not found'),
        new OA\Response(response: 422, description: 'Investment trades cannot be edited or validation error')
    ]
)]

#[OA\Delete(
    path: '/transactions/{transaction}',
    operationId: 'deleteTransaction',
    tags: ['Transactions'],
    summary: 'Delete an income or expense transaction',
    description: 'Investment BUY and SELL transactions cannot be deleted.',
    security: [['sanctum' => []]],
    parameters: [
        new OA\Parameter(name: 'transaction', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), example: 1)
    ],
    responses: [
        new OA\Response(response: 200, description: 'Transaction deleted successfully'),
        new OA\Response(response: 401, description: 'Unauthenticated'),
        new OA\Response(response: 404, description: 'Transaction not found'),
        new OA\Response(response: 422, description: 'Investment trades cannot be deleted')
    ]
)]


    #[OA\Get(
        path: '/holdings',
        summary: 'List authenticated user holdings',
        tags: ['Holdings'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'portfolio_id',
                in: 'query',
                required: false,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Holdings retrieved successfully'
            ),
            new OA\Response(
                response: 401,
                description: 'Unauthenticated'
            )
        ]
    )]

    #[OA\Post(
        path: '/holdings',
        summary: 'Create a holding',
        tags: ['Holdings'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: [
                    'portfolio_id',
                    'asset_name',
                    'asset_type',
                    'quantity',
                    'purchase_price'
                ],
                properties: [
                    new OA\Property(property: 'portfolio_id', type: 'integer', example: 1),
                    new OA\Property(property: 'asset_name', type: 'string', example: 'Safaricom PLC'),
                    new OA\Property(property: 'symbol', type: 'string', nullable: true, example: 'SCOM'),
                    new OA\Property(property: 'asset_type', type: 'string', enum: ['stock', 'bond', 'cash', 'crypto', 'other']),
                    new OA\Property(property: 'quantity', type: 'number', example: 100),
                    new OA\Property(property: 'purchase_price', type: 'number', example: 15.50),
                    new OA\Property(property: 'current_price', type: 'number', nullable: true, example: 18.00)
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Holding created successfully'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 422, description: 'Validation failed or portfolio not found')
        ]
    )]

    #[OA\Get(
        path: '/holdings/{holding}',
        summary: 'Get one holding',
        tags: ['Holdings'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'holding',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        responses: [
            new OA\Response(response: 200, description: 'Holding retrieved successfully'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 404, description: 'Holding not found')
        ]
    )]

    #[OA\Put(
        path: '/holdings/{holding}',
        summary: 'Update a holding',
        tags: ['Holdings'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'holding',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'portfolio_id', type: 'integer', example: 1),
                    new OA\Property(property: 'asset_name', type: 'string', example: 'Safaricom PLC'),
                    new OA\Property(property: 'symbol', type: 'string', nullable: true, example: 'SCOM'),
                    new OA\Property(property: 'asset_type', type: 'string', enum: ['stock', 'bond', 'cash', 'crypto', 'other']),
                    new OA\Property(property: 'quantity', type: 'number', example: 100),
                    new OA\Property(property: 'purchase_price', type: 'number', example: 15.50),
                    new OA\Property(property: 'current_price', type: 'number', example: 18.00)
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Holding updated successfully'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 404, description: 'Holding or portfolio not found'),
            new OA\Response(response: 422, description: 'Validation failed')
        ]
    )]

    #[OA\Delete(
        path: '/holdings/{holding}',
        summary: 'Delete a holding',
        tags: ['Holdings'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'holding',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        responses: [
            new OA\Response(response: 200, description: 'Holding deleted successfully'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 404, description: 'Holding not found')
        ]
    )]

    #[OA\Get(
        path: '/portfolios/{portfolio}/summary',
        summary: 'Get portfolio investment summary',
        tags: ['Portfolios'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'portfolio',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Portfolio summary retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(
                            property: 'data',
                            type: 'object',
                            properties: [
                                new OA\Property(property: 'currency', type: 'string', example: 'KES'),
                                new OA\Property(property: 'initial_balance', type: 'number', example: 100000),
                                new OA\Property(property: 'income', type: 'number', example: 85000),
                                new OA\Property(property: 'expenses', type: 'number', example: 12500),
                                new OA\Property(property: 'investment_purchases', type: 'number', example: 425),
                                new OA\Property(property: 'investment_sales', type: 'number', example: 90),
                                new OA\Property(property: 'cash_balance', type: 'number', example: 172165),
                                new OA\Property(property: 'total_investment_cost', type: 'number', example: 340),
                                new OA\Property(property: 'holdings_value', type: 'number', example: 360),
                                new OA\Property(property: 'unrealized_gain_loss', type: 'number', example: 20),
                                new OA\Property(property: 'total_portfolio_value', type: 'number', example: 172525),
                                new OA\Property(property: 'holdings_count', type: 'integer', example: 1),
                                new OA\Property(property: 'instruments', type: 'array', items: new OA\Items(type: 'object')),
                                new OA\Property(property: 'allocation', type: 'array', items: new OA\Items(type: 'object'))
                            ]
                        )
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 404, description: 'Portfolio not found')
        ]
    )]
    #[OA\Get(
        path: '/portfolios/{portfolio}/transactions',
        summary: 'List transactions for a portfolio',
        tags: ['Transactions'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'portfolio',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Portfolio transactions retrieved successfully',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(
                            property: 'data',
                            type: 'array',
                            items: new OA\Items(type: 'object')
                        )
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 404, description: 'Portfolio not found')
        ]
    )]

    #[OA\Post(
        path: '/portfolios/{portfolio}/transactions',
        summary: 'Create a transaction for a portfolio',
        tags: ['Transactions'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'portfolio',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer')
            )
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['type', 'instrument', 'quantity', 'unit_price', 'trade_date'],
                properties: [
                    new OA\Property(
                        property: 'type',
                        type: 'string',
                        enum: ['buy', 'sell'],
                        example: 'buy'
                    ),
                    new OA\Property(
                        property: 'instrument',
                        type: 'string',
                        enum: ['SCOM', 'KCB', 'EQTY', 'T-BILL-91'],
                        example: 'SCOM'
                    ),
                    new OA\Property(property: 'quantity', type: 'number', example: 100),
                    new OA\Property(property: 'unit_price', type: 'number', example: 15.50),
                    new OA\Property(property: 'trade_date', type: 'string', format: 'date', example: '2026-11-24')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Transaction created successfully'),
            new OA\Response(response: 401, description: 'Unauthenticated'),
            new OA\Response(response: 404, description: 'Portfolio not found'),
            new OA\Response(response: 422, description: 'Validation failed')
        ]
    )]

class OpenApiSpec
{
}
